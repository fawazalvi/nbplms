using Microsoft.AspNetCore.Http;

namespace Nbp.Pms.Api.Middleware;

/// <summary>
/// Hardens HTTP responses with enterprise banking security headers (OWASP Top 10 / SBP Compliance).
/// Strips server technology banners and prevents MIME-sniffing, clickjacking, and cross-site leaks.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;

            // 1. Prevent MIME-type sniffing (CWE-79, CWE-434)
            headers["X-Content-Type-Options"] = "nosniff";

            // 2. Prevent UI Redressing / Clickjacking (CWE-1021)
            headers["X-Frame-Options"] = "DENY";

            // 3. Legacy XSS filter for older user-agents
            headers["X-XSS-Protection"] = "1; mode=block";

            // 4. HTTP Strict Transport Security (HSTS) - 1 year, all subdomains
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";

            // 5. Referrer Policy - strict origin to prevent URL leakage
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // 6. Content Security Policy (CSP)
            headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https:; frame-ancestors 'none';";

            // 7. Permissions Policy (Disables browser hardware access)
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()";

            // 8. Cache-Control for sensitive banking APIs
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
                headers["Pragma"] = "no-cache";
            }

            // 9. Remove server information disclosure headers
            headers.Remove("Server");
            headers.Remove("X-Powered-By");
            headers.Remove("X-AspNet-Version");

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
