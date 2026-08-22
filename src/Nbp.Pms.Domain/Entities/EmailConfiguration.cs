namespace Nbp.Pms.Domain.Entities;

public class EmailConfiguration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ProviderType { get; set; } = "SMTP"; // SMTP, ExchangeRelay, Office365, MailHog
    public string Host { get; set; } = "mailhog";
    public int Port { get; set; } = 1025;
    public string EncryptionType { get; set; } = "None"; // None, SslTls, StartTls
    public bool RequireAuthentication { get; set; } = false;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string SenderEmail { get; set; } = "pms-notifications@nbp.com.pk";
    public string SenderDisplayName { get; set; } = "NBP Performance Management System";
    public string? ReplyToEmail { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastTestedAt { get; set; }
    public string? LastTestStatus { get; set; } // Success, Failed
    public string? LastTestError { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedByUserId { get; set; }
}
