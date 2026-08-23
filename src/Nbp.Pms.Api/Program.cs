using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Infrastructure.Persistence;
using Nbp.Pms.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "NBP Performance Management System API",
        Version = "v1",
        Description = "Enterprise Performance Appraisal System for National Bank of Pakistan (NBP)"
    });
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

// Database Registration (SQL Server with fallback to InMemory for seamless execution)
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

// Register Domain & Infrastructure Services
var masterKey = builder.Configuration["Encryption:MasterKeyBase64"] ?? "";
builder.Services.AddSingleton<IEncryptionService>(new AesGcmEncryptionService(masterKey));
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<EmployeeImportService>();
builder.Services.AddScoped<WorkflowEngine>();
builder.Services.AddScoped<FormCalculationService>();
builder.Services.AddScoped<BellCurveEngine>();
builder.Services.AddScoped<DbSeederService>();

var app = builder.Build();

// Ensure Database is created and default PMW Super Admin user exists on startup (Default 1-User Seed for Fresh Deployment)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<PmsDbContext>();
        db.Database.EnsureCreated();
        var seeder = scope.ServiceProvider.GetRequiredService<DbSeederService>();
        seeder.EnsureSuperAdminOnlyAsync().GetAwaiter().GetResult();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DB Startup note: {ex.Message}");
    }
}

// Enable Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "NBP PMS API v1");
});

app.UseCors("PmsCorsPolicy");
app.UseAuthorization();
app.MapControllers();

app.Run();
