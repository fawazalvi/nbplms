namespace Nbp.Pms.Application.Interfaces;

public interface IEmailSender
{
    Task SendEmailAsync(string recipientEmail, string recipientName, string subject, string bodyHtml, CancellationToken cancellationToken = default);
}
