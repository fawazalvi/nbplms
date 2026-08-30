namespace Nbp.Pms.Application.Interfaces;

public interface IEmailService
{
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string fullName, string sapId, string resetToken);
    Task<bool> SendWorkflowNotificationAsync(string toEmail, string fullName, string subject, string body);
}
