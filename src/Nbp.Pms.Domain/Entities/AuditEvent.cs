namespace Nbp.Pms.Domain.Entities;

public class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string EventType { get; set; }
    public required string ActorUserId { get; set; }
    public string? ActorRole { get; set; }
    public string? TargetEntityId { get; set; }
    public string? TargetEntityType { get; set; }
    public string? PreStatus { get; set; }
    public string? PostStatus { get; set; }
    public string? ActionDescription { get; set; }
    public string? JustificationComments { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
