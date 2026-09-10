using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Nbp.Pms.Application.Interfaces;

namespace Nbp.Pms.Infrastructure.Services;

/// <summary>
/// Cryptographic HMAC-SHA256 Token Service for secure, stateless API session authentication.
/// Generates and verifies tamper-proof tokens with constant-time signature verification.
/// </summary>
public class TokenService : ITokenService
{
    private readonly byte[] _signingKey;
    private static readonly TimeSpan DefaultLifetime = TimeSpan.FromHours(12);

    public TokenService(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
        {
            secret = "NbpPmsEnterpriseSecretKey2026!#BankSecureSessionHMAC";
        }
        _signingKey = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(string userId, string username, string sapId, string role, TimeSpan? lifetime = null)
    {
        var expiresAt = DateTime.UtcNow.Add(lifetime ?? DefaultLifetime);
        var roles = new List<string> { role };

        var claims = new TokenPayload
        {
            UserId = userId,
            Username = username,
            SapId = sapId,
            Role = role,
            Roles = roles,
            ExpiresAtUnix = new DateTimeOffset(expiresAt).ToUnixTimeSeconds()
        };

        var json = JsonSerializer.Serialize(claims);
        var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(json));
        var signature = ComputeHmac(payloadBase64);

        return $"{payloadBase64}.{signature}";
    }

    public AuthTokenClaims? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        var payloadBase64 = parts[0];
        var signature = parts[1];

        var expectedSignature = ComputeHmac(payloadBase64);

        // Constant-time signature comparison to eliminate timing-attack vulnerabilities
        var sigBytes = Encoding.UTF8.GetBytes(signature);
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);

        if (!CryptographicOperations.FixedTimeEquals(sigBytes, expectedBytes))
        {
            return null;
        }

        try
        {
            var jsonBytes = Base64UrlDecode(payloadBase64);
            var json = Encoding.UTF8.GetString(jsonBytes);
            var payload = JsonSerializer.Deserialize<TokenPayload>(json);

            if (payload == null) return null;

            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(payload.ExpiresAtUnix).UtcDateTime;
            if (expiresAt <= DateTime.UtcNow)
            {
                return null; // Expired token
            }

            return new AuthTokenClaims(
                payload.UserId,
                payload.Username,
                payload.SapId,
                payload.Role,
                payload.Roles ?? new List<string> { payload.Role },
                expiresAt
            );
        }
        catch
        {
            return null;
        }
    }

    private string ComputeHmac(string data)
    {
        using var hmac = new HMACSHA256(_signingKey);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var base64 = input.Replace('-', '+').Replace('_', '/');
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }
        return Convert.FromBase64String(base64);
    }

    private class TokenPayload
    {
        public string UserId { get; set; } = "";
        public string Username { get; set; } = "";
        public string SapId { get; set; } = "";
        public string Role { get; set; } = "";
        public List<string>? Roles { get; set; }
        public long ExpiresAtUnix { get; set; }
    }
}
