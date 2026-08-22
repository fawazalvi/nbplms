using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MimeKit;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Infrastructure.Services;

/// <summary>
/// Provider-independent email sender service using MailKit.
/// Dynamically fetches active SMTP / Exchange Server configuration from SQL Server database.
/// Supports plain SMTP, STARTTLS, SSL/TLS, Exchange Server Relays, and Office 365.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IServiceScopeFactory scopeFactory, ILogger<SmtpEmailSender> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task SendEmailAsync(string recipientEmail, string recipientName, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<PmsDbContext>();

            var config = await db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive, cancellationToken);
            
            string host = config?.Host ?? "mailhog";
            int port = config?.Port ?? 1025;
            string encryption = config?.EncryptionType ?? "None";
            bool reqAuth = config?.RequireAuthentication ?? false;
            string? username = config?.Username;
            string? password = config?.Password;
            string senderEmail = config?.SenderEmail ?? "pms-notifications@nbp.com.pk";
            string senderName = config?.SenderDisplayName ?? "NBP Performance Management System";
            string? replyTo = config?.ReplyToEmail;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, senderEmail));
            message.To.Add(new MailboxAddress(recipientName, recipientEmail));
            message.Subject = subject;

            if (!string.IsNullOrWhiteSpace(replyTo))
            {
                message.ReplyTo.Add(new MailboxAddress(senderName, replyTo));
            }

            var builder = new BodyBuilder
            {
                HtmlBody = bodyHtml
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            
            // Accept all certificates in development / internal bank environment if self-signed
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            SecureSocketOptions socketOptions = encryption switch
            {
                "SslTls" => SecureSocketOptions.SslOnConnect,
                "StartTls" => SecureSocketOptions.StartTls,
                _ => SecureSocketOptions.Auto
            };

            if (port == 1025 || encryption == "None")
            {
                socketOptions = SecureSocketOptions.None;
            }

            await client.ConnectAsync(host, port, socketOptions, cancellationToken);

            if (reqAuth && !string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            {
                await client.AuthenticateAsync(username, password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("[Email Dispatch] Successfully sent email to {RecipientEmail} via {Host}:{Port} ({Provider})", 
                recipientEmail, host, port, config?.ProviderType ?? "Default");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Email Dispatch Failed] Failed to send email to {RecipientEmail}: {ErrorMessage}", recipientEmail, ex.Message);
            // Re-throw or log depending on requirements - logging ensures bulk operations continue
        }
    }
}
