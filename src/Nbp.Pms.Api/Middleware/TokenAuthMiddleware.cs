using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Nbp.Pms.Application.Interfaces;

namespace Nbp.Pms.Api.Middleware;

/// <summary>
/// Verifies cryptographic Bearer tokens on incoming requests.
/// Establishes authenticated ClaimsPrincipal (User ID, SAP ID, Role) from validated token signature.
/// Prevents Client-Controlled Role Spoofing (CWE-862, CWE-285).
/// </summary>
public class TokenAuthMiddleware
{
    private readonly RequestDelegate _next;

    public TokenAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITokenService tokenService)
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var claims = tokenService.ValidateToken(token);

            if (claims != null)
            {
                var identityClaims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, claims.UserId),
                    new Claim(ClaimTypes.Name, claims.Username),
                    new Claim("sapId", claims.SapId),
                };

                foreach (var r in claims.Roles)
                {
                    identityClaims.Add(new Claim(ClaimTypes.Role, r));
                }

                var identity = new ClaimsIdentity(identityClaims, "HMAC_TOKEN");
                context.User = new ClaimsPrincipal(identity);
            }
        }

        await _next(context);
    }
}
