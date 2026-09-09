using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LocationsController : ControllerBase
{
    private readonly PmsDbContext _db;

    public LocationsController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetLocations(
        [FromQuery] string? rootPsa = null,
        [FromQuery] byte? level = null,
        [FromQuery] string? search = null)
    {
        var query = _db.Locations.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(rootPsa))
        {
            string rootPrefix = "/" + rootPsa.Trim() + "/";
            query = query.Where(l => l.PSAPath.StartsWith(rootPrefix) || l.PSACode == rootPsa.Trim());
        }

        if (level.HasValue)
        {
            query = query.Where(l => l.DepthLevel == level.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            string term = search.Trim().ToLower();
            query = query.Where(l =>
                l.PSACode.ToLower().Contains(term) ||
                l.Name.ToLower().Contains(term) ||
                (l.PACode != null && l.PACode.ToLower().Contains(term)) ||
                (l.City != null && l.City.ToLower().Contains(term)) ||
                (l.Category != null && l.Category.ToLower().Contains(term)));
        }

        var locations = await query
            .OrderBy(l => l.DepthLevel)
            .ThenBy(l => l.PSACode)
            .Select(l => new LocationItemDto(
                l.PSACode,
                l.ParentPSACode,
                l.Name,
                l.PACode,
                l.Category,
                l.City,
                l.Country,
                l.Latitude,
                l.Longitude,
                l.PSAPath,
                l.DepthLevel,
                _db.Locations.Count(c => c.ParentPSACode == l.PSACode)
            ))
            .ToListAsync();

        return Ok(locations);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var total = await _db.Locations.CountAsync();
        var level0 = await _db.Locations.CountAsync(l => l.DepthLevel == 0);
        var level1 = await _db.Locations.CountAsync(l => l.DepthLevel == 1);
        var level2 = await _db.Locations.CountAsync(l => l.DepthLevel == 2);
        var level3 = await _db.Locations.CountAsync(l => l.DepthLevel == 3);
        var geoTagged = await _db.Locations.CountAsync(l => l.Latitude != null && l.Longitude != null);

        var roots = await _db.Locations
            .Where(l => l.DepthLevel == 0)
            .OrderBy(l => l.PSACode)
            .Select(r => new SegmentSummaryDto(
                r.PSACode,
                r.Name,
                _db.Locations.Count(c => c.PSAPath.StartsWith("/" + r.PSACode + "/"))
            ))
            .ToListAsync();

        return Ok(new LocationSummaryResponse(
            total,
            level0,
            level1,
            level2,
            level3,
            geoTagged,
            roots
        ));
    }

    [HttpGet("{psaCode}")]
    public async Task<IActionResult> GetLocationByPsa(string psaCode)
    {
        var loc = await _db.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.PSACode == psaCode);

        if (loc == null) return NotFound(new { message = $"Location with PSA code {psaCode} not found." });

        var children = await _db.Locations
            .AsNoTracking()
            .Where(l => l.ParentPSACode == psaCode)
            .OrderBy(l => l.PSACode)
            .Select(c => new LocationItemDto(
                c.PSACode,
                c.ParentPSACode,
                c.Name,
                c.PACode,
                c.Category,
                c.City,
                c.Country,
                c.Latitude,
                c.Longitude,
                c.PSAPath,
                c.DepthLevel,
                _db.Locations.Count(gc => gc.ParentPSACode == c.PSACode)
            ))
            .ToListAsync();

        LocationItemDto? parentDto = null;
        if (!string.IsNullOrWhiteSpace(loc.ParentPSACode))
        {
            var p = await _db.Locations.AsNoTracking().FirstOrDefaultAsync(x => x.PSACode == loc.ParentPSACode);
            if (p != null)
            {
                parentDto = new LocationItemDto(
                    p.PSACode, p.ParentPSACode, p.Name, p.PACode, p.Category,
                    p.City, p.Country, p.Latitude, p.Longitude, p.PSAPath, p.DepthLevel, 0
                );
            }
        }

        // Build ancestry breadcrumbs from PSAPath
        var breadcrumbs = new List<LocationBreadcrumbDto>();
        if (!string.IsNullOrWhiteSpace(loc.PSAPath))
        {
            var segments = loc.PSAPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length > 0)
            {
                var ancestorNodes = await _db.Locations
                    .AsNoTracking()
                    .Where(l => segments.Contains(l.PSACode))
                    .ToDictionaryAsync(l => l.PSACode);

                foreach (var seg in segments)
                {
                    if (ancestorNodes.TryGetValue(seg, out var anc))
                    {
                        breadcrumbs.Add(new LocationBreadcrumbDto(anc.PSACode, anc.Name, anc.DepthLevel));
                    }
                }
            }
        }

        var detail = new LocationDetailResponse(
            new LocationItemDto(
                loc.PSACode,
                loc.ParentPSACode,
                loc.Name,
                loc.PACode,
                loc.Category,
                loc.City,
                loc.Country,
                loc.Latitude,
                loc.Longitude,
                loc.PSAPath,
                loc.DepthLevel,
                children.Count
            ),
            parentDto,
            children,
            breadcrumbs
        );

        return Ok(detail);
    }

    [HttpGet("{psaCode}/subtree")]
    public async Task<IActionResult> GetSubtree(string psaCode)
    {
        var root = await _db.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.PSACode == psaCode);
        if (root == null) return NotFound(new { message = $"Location {psaCode} not found." });

        string prefix = root.PSAPath;
        var descendants = await _db.Locations
            .AsNoTracking()
            .Where(l => l.PSAPath.StartsWith(prefix) && l.PSACode != psaCode)
            .OrderBy(l => l.DepthLevel)
            .ThenBy(l => l.PSACode)
            .Select(l => new LocationItemDto(
                l.PSACode,
                l.ParentPSACode,
                l.Name,
                l.PACode,
                l.Category,
                l.City,
                l.Country,
                l.Latitude,
                l.Longitude,
                l.PSAPath,
                l.DepthLevel,
                _db.Locations.Count(c => c.ParentPSACode == l.PSACode)
            ))
            .ToListAsync();

        return Ok(descendants);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PSACode) || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "PSACode and Name are required." });
        }

        string psa = dto.PSACode.Trim();
        if (psa.Length != 4)
        {
            return BadRequest(new { message = "PSACode must be exactly 4 characters." });
        }

        var exists = await _db.Locations.AnyAsync(l => l.PSACode == psa);
        if (exists)
        {
            return Conflict(new { message = $"A location with PSACode '{psa}' already exists." });
        }

        string? parentPsa = string.IsNullOrWhiteSpace(dto.ParentPSACode) ? null : dto.ParentPSACode.Trim();
        Location? parent = null;
        if (parentPsa != null)
        {
            parent = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == parentPsa);
            if (parent == null)
            {
                return BadRequest(new { message = $"Parent location '{parentPsa}' does not exist." });
            }
        }

        string computedPath = parent == null ? $"/{psa}/" : $"{parent.PSAPath}{psa}/";
        byte computedDepth = parent == null ? (byte)0 : (byte)(parent.DepthLevel + 1);

        var loc = new Location
        {
            PSACode = psa,
            ParentPSACode = parentPsa,
            Name = dto.Name.Trim(),
            PACode = dto.PACode?.Trim(),
            Category = dto.Category?.Trim(),
            City = dto.City?.Trim(),
            Country = dto.Country?.Trim() ?? "PK",
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            PSAPath = computedPath,
            DepthLevel = computedDepth
        };

        _db.Locations.Add(loc);

        var audit = new AuditEvent
        {
            EventType = "LOCATION_CREATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityId = loc.PSACode,
            TargetEntityType = nameof(Location),
            ActionDescription = $"Created location unit: {loc.Name} ({loc.PSACode}) under parent: {loc.ParentPSACode ?? "ROOT"}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLocationByPsa), new { psaCode = loc.PSACode }, loc);
    }

    [HttpPut("{psaCode}")]
    public async Task<IActionResult> UpdateLocation(string psaCode, [FromBody] UpdateLocationDto dto)
    {
        var loc = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == psaCode);
        if (loc == null) return NotFound(new { message = $"Location {psaCode} not found." });

        if (!string.IsNullOrWhiteSpace(dto.Name)) loc.Name = dto.Name.Trim();
        loc.PACode = dto.PACode?.Trim();
        loc.Category = dto.Category?.Trim();
        loc.City = dto.City?.Trim();
        loc.Country = dto.Country?.Trim() ?? loc.Country;
        loc.Latitude = dto.Latitude;
        loc.Longitude = dto.Longitude;

        var audit = new AuditEvent
        {
            EventType = "LOCATION_UPDATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityId = loc.PSACode,
            TargetEntityType = nameof(Location),
            ActionDescription = $"Updated metadata for location: {loc.Name} ({loc.PSACode}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(loc);
    }

    [HttpPut("{psaCode}/reparent")]
    public async Task<IActionResult> ReparentLocation(string psaCode, [FromBody] ReparentLocationDto dto)
    {
        var loc = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == psaCode);
        if (loc == null) return NotFound(new { message = $"Location {psaCode} not found." });

        string? newParentPsa = string.IsNullOrWhiteSpace(dto.NewParentPSACode) ? null : dto.NewParentPSACode.Trim();

        // 1. Direct self-reference check
        if (newParentPsa == psaCode)
        {
            return BadRequest(new { message = "Circular reference error: A location cannot be its own parent." });
        }

        Location? newParent = null;
        if (newParentPsa != null)
        {
            newParent = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == newParentPsa);
            if (newParent == null)
            {
                return BadRequest(new { message = $"Target parent location '{newParentPsa}' not found." });
            }

            // 2. Cycle prevention: target parent cannot be inside the subtree of the moving node
            if (newParent.PSAPath.Contains("/" + psaCode + "/"))
            {
                return BadRequest(new { message = $"Circular reference error: Target parent '{newParentPsa}' is a descendant of node '{psaCode}'." });
            }
        }

        string oldParent = loc.ParentPSACode ?? "ROOT";
        loc.ParentPSACode = newParentPsa;

        var audit = new AuditEvent
        {
            EventType = "LOCATION_REPARENTED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityId = loc.PSACode,
            TargetEntityType = nameof(Location),
            ActionDescription = $"Moved location {loc.Name} ({loc.PSACode}) from parent {oldParent} to {newParentPsa ?? "ROOT"}. Trigger updated hierarchy lineage.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        // Save changes - SQL Server trigger trg_location_MaintainHierarchy automatically cascades PSAPath & DepthLevel down subtree
        await _db.SaveChangesAsync();

        // Reload to return freshly recalculated PSAPath and DepthLevel
        await _db.Entry(loc).ReloadAsync();

        return Ok(loc);
    }

    [HttpDelete("{psaCode}")]
    public async Task<IActionResult> DeleteLocation(string psaCode, [FromQuery] string actorUserId = "PMW_ADMIN")
    {
        var loc = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == psaCode);
        if (loc == null) return NotFound(new { message = $"Location {psaCode} not found." });

        var hasChildren = await _db.Locations.AnyAsync(l => l.ParentPSACode == psaCode);
        if (hasChildren)
        {
            return BadRequest(new { message = $"Cannot delete location '{psaCode}' because it has sub-branches or child units assigned to it. Reparent or delete children first." });
        }

        _db.Locations.Remove(loc);

        var audit = new AuditEvent
        {
            EventType = "LOCATION_DELETED",
            ActorUserId = actorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = loc.PSACode,
            TargetEntityType = nameof(Location),
            ActionDescription = $"Deleted location unit: {loc.Name} ({loc.PSACode}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Location '{psaCode}' ({loc.Name}) was deleted successfully." });
    }
}

public record LocationItemDto(
    string PSACode,
    string? ParentPSACode,
    string Name,
    string? PACode,
    string? Category,
    string? City,
    string? Country,
    double? Latitude,
    double? Longitude,
    string PSAPath,
    byte DepthLevel,
    int ChildCount
);

public record SegmentSummaryDto(string PSACode, string Name, int TotalCount);

public record LocationSummaryResponse(
    int TotalLocations,
    int Level0Count,
    int Level1Count,
    int Level2Count,
    int Level3Count,
    int GeoTaggedCount,
    List<SegmentSummaryDto> Segments
);

public record LocationBreadcrumbDto(string PSACode, string Name, byte DepthLevel);

public record LocationDetailResponse(
    LocationItemDto Location,
    LocationItemDto? Parent,
    List<LocationItemDto> Children,
    List<LocationBreadcrumbDto> Breadcrumbs
);

public record CreateLocationDto(
    string PSACode,
    string Name,
    string? ParentPSACode = null,
    string? PACode = null,
    string? Category = null,
    string? City = null,
    string? Country = "PK",
    double? Latitude = null,
    double? Longitude = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record UpdateLocationDto(
    string? Name = null,
    string? PACode = null,
    string? Category = null,
    string? City = null,
    string? Country = null,
    double? Latitude = null,
    double? Longitude = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record ReparentLocationDto(
    string? NewParentPSACode,
    string? ActorUserId = "PMW_ADMIN"
);
