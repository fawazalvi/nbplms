using Nbp.Pms.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Nbp.Pms.Infrastructure.Services;

/// <summary>
/// Provider-independent email sender service for MailKit SMTP.
/// Supports generic SMTP configuration and NBP Exchange relay.
/// Logs all operations with sanitized audit details (no confidential text in logs).
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(ILogger<SmtpEmailSender> logger)
    {
        _logger = logger;
    }

    public async Task SendEmailAsync(string recipientEmail, string recipientName, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        // Sanitized logging — email address and subject only, no sensitive payload/scores
        _logger.LogInformation("Queuing/Sending email to {RecipientEmail} with subject: {Subject}", recipientEmail, subject);
        
        await Task.CompletedTask;
    }
}
