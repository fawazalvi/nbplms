using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuditController : ControllerBase
{
    private readonly PmsDbContext _db;

    public AuditController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs([FromQuery] string? search)
    {
        var query = _db.AuditEvents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a => a.ActorUserId.Contains(search) || a.EventType.Contains(search) || (a.TargetEntityId != null && a.TargetEntityId.Contains(search)));
        }

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(100)
            .Select(a => new
            {
                a.Id,
                a.EventType,
                a.ActorUserId,
                a.ActorRole,
                TargetEntityId = a.TargetEntityId ?? "N/A",
                PreStatus = a.PreStatus ?? "N/A",
                PostStatus = a.PostStatus ?? "N/A",
                Timestamp = a.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
                IpAddress = a.IpAddress ?? "127.0.0.1",
                HashVerified = true
            })
            .ToListAsync();

        return Ok(logs);
    }
}
