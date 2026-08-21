namespace Nbp.Pms.Domain.Entities;

public class KeyVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int VersionNumber { get; set; }
    public required string KeyReference { get; set; } // Reference string to KMS vault, never raw key
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RotatedAt { get; set; }
}
