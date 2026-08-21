namespace Nbp.Pms.Application.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Username { get; }
    string? SapId { get; }
    List<string> Roles { get; }
    bool IsAuthenticated { get; }
}
