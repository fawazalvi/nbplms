using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CyclesController : ControllerBase
{
    private readonly PmsDbContext _db;

    public CyclesController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetCycles()
    {
        var cycles = await _db.AppraisalCycles.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(cycles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCycle([FromBody] AppraisalCycle cycle)
    {
        if (string.IsNullOrWhiteSpace(cycle.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        _db.AppraisalCycles.Add(cycle);
        await _db.SaveChangesAsync();
        return Ok(cycle);
    }

    [HttpPost("{id}/open")]
    public async Task<IActionResult> OpenCycle(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleActive;
        cycle.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Cycle activated successfully.", cycle });
    }

    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> SuspendCycle(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleSuspended;
        cycle.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Cycle suspended.", cycle });
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseCycle(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleClosed;
        cycle.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Cycle closed.", cycle });
    }
}
