namespace Nbp.Pms.Application.Interfaces;

public record AuthTokenClaims(
    string UserId, 
    string Username, 
    string SapId, 
    string Role, 
    List<string> Roles, 
    DateTime ExpiresAt
);

public interface ITokenService
{
    string GenerateToken(string userId, string username, string sapId, string role, TimeSpan? lifetime = null);
    AuthTokenClaims? ValidateToken(string token);
}
