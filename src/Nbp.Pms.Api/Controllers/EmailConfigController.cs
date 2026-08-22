using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class EmailConfigController : ControllerBase
{
    private readonly PmsDbContext _db;

    public EmailConfigController(PmsDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Gets the current active system email / exchange server configuration.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetEmailConfiguration()
    {
        var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive)
                     ?? await _db.EmailConfigurations.OrderByDescending(c => c.UpdatedAt).FirstOrDefaultAsync();

        if (config == null)
        {
            // Return default MailHog / SMTP fallback
            return Ok(new
            {
                providerType = "MailHog",
                host = "mailhog",
                port = 1025,
                encryptionType = "None",
                requireAuthentication = false,
                username = "",
                hasPassword = false,
                senderEmail = "pms-notifications@nbp.com.pk",
                senderDisplayName = "NBP Performance Management System",
                replyToEmail = "hr-support@nbp.com.pk",
                isActive = true,
                lastTestedAt = (DateTime?)null,
                lastTestStatus = "Not Tested",
                lastTestError = (string?)null
            });
        }

        return Ok(new
        {
            config.Id,
            config.ProviderType,
            config.Host,
            config.Port,
            config.EncryptionType,
            config.RequireAuthentication,
            config.Username,
            HasPassword = !string.IsNullOrWhiteSpace(config.Password),
            config.SenderEmail,
            config.SenderDisplayName,
            config.ReplyToEmail,
            config.IsActive,
            config.LastTestedAt,
            config.LastTestStatus,
            config.LastTestError,
            config.UpdatedAt,
            config.UpdatedByUserId
        });
    }

    /// <summary>
    /// Saves or updates the system email / exchange server configuration (PmwSuperAdmin).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> SaveEmailConfiguration([FromBody] SaveEmailConfigDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Host))
        {
            return BadRequest(new { message = "SMTP / Exchange Server Host is required." });
        }

        if (string.IsNullOrWhiteSpace(dto.SenderEmail))
        {
            return BadRequest(new { message = "Sender Email Address is required." });
        }

        var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive)
                     ?? await _db.EmailConfigurations.OrderByDescending(c => c.UpdatedAt).FirstOrDefaultAsync();

        if (config == null)
        {
            config = new EmailConfiguration();
            _db.EmailConfigurations.Add(config);
        }

        config.ProviderType = dto.ProviderType ?? "SMTP";
        config.Host = dto.Host.Trim();
        config.Port = dto.Port > 0 ? dto.Port : 25;
        config.EncryptionType = dto.EncryptionType ?? "None";
        config.RequireAuthentication = dto.RequireAuthentication;
        config.Username = dto.Username?.Trim();
        
        // If password is provided, update it; otherwise preserve existing password
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            config.Password = dto.Password;
        }

        config.SenderEmail = dto.SenderEmail.Trim();
        config.SenderDisplayName = dto.SenderDisplayName?.Trim() ?? "NBP Performance Management System";
        config.ReplyToEmail = dto.ReplyToEmail?.Trim();
        config.IsActive = true;
        config.UpdatedAt = DateTime.UtcNow;
        config.UpdatedByUserId = dto.ActorUserId ?? "SUPER_ADMIN";

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "EMAIL_CONFIGURATION_UPDATED",
            ActorUserId = dto.ActorUserId ?? "SUPER_ADMIN",
            ActorRole = "PmwSuperAdmin",
            TargetEntityType = nameof(EmailConfiguration),
            ActionDescription = $"Updated System Email Configuration — Provider: {config.ProviderType}, Host: {config.Host}:{config.Port}, Encryption: {config.EncryptionType}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Email & Exchange Server configuration saved successfully.",
            configId = config.Id
        });
    }

    /// <summary>
    /// Tests the connection to the configured SMTP / Exchange server by sending a live test message.
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> TestEmailConnection([FromBody] TestEmailConnectionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Host))
        {
            return BadRequest(new { success = false, message = "Server Host is required for connection testing." });
        }

        string recipient = string.IsNullOrWhiteSpace(dto.TestRecipientEmail) 
            ? (dto.SenderEmail ?? "admin@nbp.com.pk") 
            : dto.TestRecipientEmail.Trim();

        var startTime = DateTime.UtcNow;
        try
        {
            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            SecureSocketOptions socketOptions = dto.EncryptionType switch
            {
                "SslTls" => SecureSocketOptions.SslOnConnect,
                "StartTls" => SecureSocketOptions.StartTls,
                _ => SecureSocketOptions.Auto
            };

            if (dto.Port == 1025 || dto.EncryptionType == "None")
            {
                socketOptions = SecureSocketOptions.None;
            }

            await client.ConnectAsync(dto.Host.Trim(), dto.Port, socketOptions);

            if (dto.RequireAuthentication)
            {
                // Retrieve password from DTO or fallback to existing active DB configuration
                var existingConfig = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive);
                string? effectiveUsername = !string.IsNullOrWhiteSpace(dto.Username) ? dto.Username.Trim() : existingConfig?.Username;
                string? effectivePassword = !string.IsNullOrWhiteSpace(dto.Password) ? dto.Password : existingConfig?.Password;

                if (string.IsNullOrWhiteSpace(effectiveUsername) || string.IsNullOrWhiteSpace(effectivePassword))
                {
                    return Ok(new
                    {
                        success = false,
                        message = "Connection failed: SMTP Authentication is enabled, but Username or Password is missing. Please enter your SMTP credentials in the form.",
                        testedAt = DateTime.UtcNow
                    });
                }

                client.AuthenticationMechanisms.Remove("XOAUTH2");
                await client.AuthenticateAsync(effectiveUsername, effectivePassword);
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(dto.SenderDisplayName ?? "NBP Performance Management System", dto.SenderEmail ?? "pms-notifications@nbp.com.pk"));
            message.To.Add(new MailboxAddress("System Administrator", recipient));
            message.Subject = $"[NBP PMS 2.0] SMTP / Exchange Connection Test — {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

            var builder = new BodyBuilder
            {
                HtmlBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #006633; border-radius: 8px;'>
                        <div style='background: #006633; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <h2 style='margin: 0;'>National Bank of Pakistan</h2>
                            <p style='margin: 4px 0 0 0; font-size: 12px;'>Performance Management System (PMS 2.0)</p>
                        </div>
                        <div style='padding: 20px 0;'>
                            <h3 style='color: #006633;'>✔ Email Configuration Test Successful</h3>
                            <p style='font-size: 13px; color: #333;'>
                                This test email confirms that your system email / Microsoft Exchange relay configuration is active and operational.
                            </p>
                            <table style='width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 15px;'>
                                <tr style='background: #f4fbf7;'><td style='padding: 8px; font-weight: bold;'>Server Host:</td><td style='padding: 8px;'>{dto.Host}</td></tr>
                                <tr><td style='padding: 8px; font-weight: bold;'>Port:</td><td style='padding: 8px;'>{dto.Port}</td></tr>
                                <tr style='background: #f4fbf7;'><td style='padding: 8px; font-weight: bold;'>Security / Encryption:</td><td style='padding: 8px;'>{dto.EncryptionType}</td></tr>
                                <tr><td style='padding: 8px; font-weight: bold;'>Provider:</td><td style='padding: 8px;'>{dto.ProviderType ?? "SMTP"}</td></tr>
                                <tr style='background: #f4fbf7;'><td style='padding: 8px; font-weight: bold;'>Timestamp:</td><td style='padding: 8px;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
                            </table>
                        </div>
                        <div style='border-top: 1px solid #eee; padding-top: 12px; font-size: 11px; color: #888; text-align: center;'>
                            Strategy & Rewards Division | Information Security Wing | NBP
                        </div>
                    </div>"
            };
            message.Body = builder.ToMessageBody();

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            var elapsedMs = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Update status on active config in DB if exists
            var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive);
            if (config != null)
            {
                config.LastTestedAt = DateTime.UtcNow;
                config.LastTestStatus = "Success";
                config.LastTestError = null;
                await _db.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                message = $"Connection test succeeded! Test email dispatched to {recipient} in {elapsedMs:F0}ms.",
                elapsedMs = (int)elapsedMs,
                testedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive);
            if (config != null)
            {
                config.LastTestedAt = DateTime.UtcNow;
                config.LastTestStatus = "Failed";
                config.LastTestError = ex.Message;
                await _db.SaveChangesAsync();
            }

            return Ok(new
            {
                success = false,
                message = $"Connection failed: {ex.Message}",
                errorDetail = ex.ToString(),
                testedAt = DateTime.UtcNow
            });
        }
    }
}

public record SaveEmailConfigDto(
    string? ProviderType,
    string Host,
    int Port,
    string? EncryptionType,
    bool RequireAuthentication,
    string? Username,
    string? Password,
    string SenderEmail,
    string? SenderDisplayName,
    string? ReplyToEmail,
    string? ActorUserId
);

public record TestEmailConnectionDto(
    string? ProviderType,
    string Host,
    int Port,
    string? EncryptionType,
    bool RequireAuthentication,
    string? Username,
    string? Password,
    string? SenderEmail,
    string? SenderDisplayName,
    string? TestRecipientEmail
);
