namespace Nbp.Pms.Contracts.DTOs;

public record LoginRequestDto(string Username, string Password);

public record UserDto(
    string Id,
    string Username,
    string Email,
    string FullName,
    string SapId,
    List<string> Roles,
    List<string> Permissions,
    bool MustChangePassword
);

public record ChangePasswordRequestDto(string CurrentPassword, string NewPassword);

public record ForgotPasswordRequestDto(string EmailOrSapId);

public record ResetPasswordRequestDto(string Token, string NewPassword);

public record AuthResultDto(bool Success, string? Message, UserDto? User);
