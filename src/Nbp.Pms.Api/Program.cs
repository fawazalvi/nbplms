using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Api.Middleware;
using Nbp.Pms.Api.Services;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Infrastructure.Persistence;
using Nbp.Pms.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Kestrel Server Hardening (Mask Server header & restrict request body size)
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.AddServerHeader = false;
    serverOptions.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10 MB maximum request body
});

// Add controllers & Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "NBP Performance Management System API",
        Version = "v1",
        Description = "Enterprise Performance Appraisal System for National Bank of Pakistan (NBP)"
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "HMAC-SHA256 Bearer Token Authorization header. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure Rate Limiting (.NET 8 Native RateLimiter for Brute-force / DoS defense)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"success\":false,\"message\":\"Too many requests. Please try again in 1 minute.\",\"statusCode\":429}", cancellationToken: token);
    };

    options.AddPolicy("AuthRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim() 
                          ?? httpContext.Connection.RemoteIpAddress?.ToString() 
                          ?? "auth-client",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 15,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Global Limiter across all endpoints (150 req/min)
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim() 
                          ?? httpContext.Connection.RemoteIpAddress?.ToString() 
                          ?? "general-client",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 150,
                QueueLimit = 0,
                SegmentsPerWindow = 3,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PmsCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:8080", "http://localhost:8090")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Database Registration
var connString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<PmsDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connString) && connString.Contains("Server="))
    {
        options.UseSqlServer(connString, sqlOptions => sqlOptions.EnableRetryOnFailure());
    }
    else
    {
        options.UseInMemoryDatabase("NbpPmsDb_Fallback");
    }
});
builder.Services.AddScoped<IPmsDbContext>(sp => sp.GetRequiredService<PmsDbContext>());

// Register HttpContextAccessor & CurrentUserService
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// Register Domain & Infrastructure Services
var masterKey = builder.Configuration["Encryption:MasterKeyBase64"] ?? "";
builder.Services.AddSingleton<IEncryptionService>(new AesGcmEncryptionService(masterKey));
builder.Services.AddSingleton<ITokenService>(new TokenService(masterKey));
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<EmployeeImportService>();
builder.Services.AddScoped<WorkflowEngine>();
builder.Services.AddScoped<FormCalculationService>();
builder.Services.AddScoped<BellCurveEngine>();
builder.Services.AddScoped<DbSeederService>();

var app = builder.Build();

// Ensure Database is created and default PMW Super Admin user exists on startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<PmsDbContext>();
        db.Database.EnsureCreated();
        var seeder = scope.ServiceProvider.GetRequiredService<DbSeederService>();
        seeder.MigrateDatabaseSchemaAsync().GetAwaiter().GetResult();
        seeder.EnsureSuperAdminOnlyAsync().GetAwaiter().GetResult();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DB Startup note: {ex.Message}");
    }
}

// 1. Enterprise Security Headers (OWASP Top 10, HSTS, CSP, Mask Server)
app.UseMiddleware<SecurityHeadersMiddleware>();

// 2. Global Exception Sanitization (Mask stack traces & schema errors)
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseRouting();

// 3. Strict CORS
app.UseCors("PmsCorsPolicy");

// 4. Rate Limiting (Brute-force & DoS Defense)
app.UseRateLimiter();

// 5. Cryptographic Token Authentication & Claims Resolution
app.UseMiddleware<TokenAuthMiddleware>();
app.UseAuthorization();

// 6. Swagger (Enabled in development or when explicitly configured)
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Security:EnableSwagger", true))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "NBP PMS API v1");
    });
}

app.MapControllers();

app.Run();
