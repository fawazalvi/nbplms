using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly PmsDbContext _db;

    public EmailService(PmsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string fullName, string sapId, string resetToken)
    {
        try
        {
            var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive);
            
            // Fallback to MailHog config if no config is found in DB
            string host = config?.Host ?? "mailhog";
            int port = config?.Port ?? 1025;
            string encryptionType = config?.EncryptionType ?? "None";
            bool requireAuth = config?.RequireAuthentication ?? false;
            string username = config?.Username ?? "";
            string password = config?.Password ?? "";
            string senderEmail = config?.SenderEmail ?? "pms-notifications@nbp.com.pk";
            string senderDisplayName = config?.SenderDisplayName ?? "NBP Performance Management System";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderDisplayName, senderEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "[NBP PMS 2.0] Password Reset / Setup Instructions";

            string resetUrl = $"http://localhost:5173/reset-password?token={resetToken}";

            var builder = new BodyBuilder
            {
                HtmlBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #006633; border-radius: 8px;'>
                        <div style='background: #006633; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <h2 style='margin: 0;'>National Bank of Pakistan</h2>
                            <p style='margin: 4px 0 0 0; font-size: 12px;'>Performance Management System (PMS 2.0)</p>
                        </div>
                        <div style='padding: 20px 0;'>
                            <h3 style='color: #006633;'>Password Setup / Reset Request</h3>
                            <p style='font-size: 14px; color: #333;'>Dear <strong>{fullName}</strong> (SAP ID: {sapId}),</p>
                            <p style='font-size: 13px; color: #333;'>
                                A request was made to set or reset the password for your NBP PMS 2.0 account. Please click the button below to securely set your password. This link is valid for 1 hour.
                            </p>
                            <div style='text-align: center; margin: 25px 0;'>
                                <a href='{resetUrl}' style='background-color: #006633; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;'>Set New Password</a>
                            </div>
                            <p style='font-size: 12px; color: #666;'>
                                If you did not request this, please ignore this email or contact HR Support.
                            </p>
                        </div>
                        <div style='border-top: 1px solid #eee; padding-top: 12px; font-size: 11px; color: #888; text-align: center;'>
                            Strategy & Rewards Division | Information Security Wing | NBP
                        </div>
                    </div>"
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            SecureSocketOptions socketOptions = encryptionType switch
            {
                "SslTls" => SecureSocketOptions.SslOnConnect,
                "StartTls" => SecureSocketOptions.StartTls,
                _ => SecureSocketOptions.Auto
            };

            if (port == 1025 || encryptionType == "None")
            {
                socketOptions = SecureSocketOptions.None;
            }

            await client.ConnectAsync(host, port, socketOptions);

            if (requireAuth && !string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            {
                client.AuthenticationMechanisms.Remove("XOAUTH2");
                await client.AuthenticateAsync(username, password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> SendWorkflowNotificationAsync(string toEmail, string fullName, string subject, string body)
    {
        try
        {
            var config = await _db.EmailConfigurations.FirstOrDefaultAsync(c => c.IsActive)
                         ?? await _db.EmailConfigurations.OrderByDescending(c => c.UpdatedAt).FirstOrDefaultAsync();
            
            string host = !string.IsNullOrWhiteSpace(config?.Host) ? config.Host.Trim() : "mailhog";
            int port = config?.Port ?? 1025;
            string encryptionType = config?.EncryptionType ?? "None";
            bool requireAuth = config?.RequireAuthentication ?? false;
            string username = config?.Username?.Trim() ?? "";
            string password = config?.Password ?? "";
            string senderEmail = !string.IsNullOrWhiteSpace(config?.SenderEmail) ? config.SenderEmail.Trim() : "pms-notifications@nbp.com.pk";
            string senderDisplayName = !string.IsNullOrWhiteSpace(config?.SenderDisplayName) ? config.SenderDisplayName.Trim() : "NBP Performance Management System";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderDisplayName, senderEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail.Trim()));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = body.Contains("<table") ? body : $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #006633; border-radius: 8px;'>
                    <div style='background: #006633; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                        <h2 style='margin: 0;'>National Bank of Pakistan</h2>
                        <p style='margin: 4px 0 0 0; font-size: 12px;'>Performance Management System (PMS 2.0)</p>
                    </div>
                    <div style='padding: 20px 0;'>
                        <h3 style='color: #006633;'>Workflow Notification</h3>
                        <p style='font-size: 14px; color: #333;'>Dear <strong>{fullName}</strong>,</p>
                        <p style='font-size: 13px; color: #333; line-height: 1.6;'>{body}</p>
                        <div style='text-align: center; margin: 25px 0;'>
                            <a href='http://localhost:5173' style='background-color: #006633; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;'>Access PMS Portal</a>
                        </div>
                    </div>
                    <div style='border-top: 1px solid #eee; padding-top: 12px; font-size: 11px; color: #888; text-align: center;'>
                        HR Management Group | National Bank of Pakistan
                    </div>
                </div>"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;
            
            SecureSocketOptions socketOptions = encryptionType switch
            {
                "SslTls" => SecureSocketOptions.SslOnConnect,
                "StartTls" => SecureSocketOptions.StartTls,
                _ => SecureSocketOptions.Auto
            };

            if (port == 1025 || encryptionType == "None")
            {
                socketOptions = SecureSocketOptions.None;
            }

            try
            {
                await client.ConnectAsync(host, port, socketOptions);
            }
            catch (Exception) when (host.Equals("mailhog", StringComparison.OrdinalIgnoreCase))
            {
                await client.ConnectAsync("localhost", port, socketOptions);
            }

            if (requireAuth && !string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            {
                client.AuthenticationMechanisms.Remove("XOAUTH2");
                await client.AuthenticateAsync(username, password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            Console.WriteLine($"[EMAIL SUCCESS] Notification sent to {toEmail} ({fullName}) for '{subject}'");

            _db.AuditEvents.Add(new AuditEvent
            {
                EventType = "NOTIFICATION_DISPATCHED",
                ActorUserId = "SYSTEM_WORKFLOW",
                ActorRole = "WorkflowEngine",
                ActionDescription = $"Dispatched email to {fullName} ({toEmail}): {subject}",
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL FAILURE] Could not send notification to {toEmail}: {ex.Message}");
            try
            {
                _db.AuditEvents.Add(new AuditEvent
                {
                    EventType = "NOTIFICATION_DISPATCH_FAILED",
                    ActorUserId = "SYSTEM_WORKFLOW",
                    ActorRole = "WorkflowEngine",
                    ActionDescription = $"Failed sending email to {fullName} ({toEmail}): {ex.Message}",
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();
            }
            catch { }
            return false;
        }
    }
}
