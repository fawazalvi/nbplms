using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Nbp.Pms.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions across all endpoints and sanitizes error responses.
/// Prevents Information Disclosure (CWE-209) by masking stack traces and internal database schemas.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Response has already started, cannot write sanitized error response.");
            return;
        }

        var errorReferenceId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        _logger.LogError(ex, "[Security ErrorRef: {ErrorRef}] Unhandled exception at {Path}: {Message}", 
            errorReferenceId, context.Request.Path, ex.Message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new
        {
            success = false,
            message = "An unexpected error occurred while processing your request. Please contact system administration.",
            errorReference = errorReferenceId,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}
