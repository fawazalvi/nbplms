using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nbp.Pms.Domain.Entities;

[Table("location")]
public class Location
{
    [Key]
    [MaxLength(4)]
    public string PSACode { get; set; } = string.Empty;

    [MaxLength(4)]
    public string? ParentPSACode { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(4)]
    public string? PACode { get; set; }

    [MaxLength(50)]
    public string? Category { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    [Required]
    [MaxLength(40)]
    public string PSAPath { get; set; } = string.Empty;

    public byte DepthLevel { get; set; } = 0;

    // Navigation properties
    public virtual Location? Parent { get; set; }
    public virtual ICollection<Location> Children { get; set; } = new List<Location>();
}
