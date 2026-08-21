using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class RemindersController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly IEmailSender _emailSender;

    public RemindersController(PmsDbContext db, IEmailSender emailSender)
    {
        _db = db;
        _emailSender = emailSender;
    }

    [HttpGet("preview")]
    public async Task<IActionResult> PreviewRecipients([FromQuery] string? group, [FromQuery] string? grade)
    {
        var query = _db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(group) && group != "All Groups")
        {
            query = query.Where(e => e.ReportingGroup == group);
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "All Grades")
        {
            query = query.Where(e => e.Grade == grade);
        }

        var recipients = await query.Select(e => new
        {
            e.SapId,
            e.FullName,
            e.Grade,
            e.ReportingGroup,
            CurrentStatus = "Objective Draft"
        }).ToListAsync();

        return Ok(recipients);
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendReminders([FromBody] ReminderDispatchDto dto)
    {
        var query = _db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Group) && dto.Group != "All Groups")
        {
            query = query.Where(e => e.ReportingGroup == dto.Group);
        }

        var employees = await query.ToListAsync();
        foreach (var emp in employees)
        {
            await _emailSender.SendEmailAsync(emp.Email ?? $"{emp.SapId}@nbp.com.pk", emp.FullName, dto.Subject, dto.MessageBody);
        }

        var audit = new AuditEvent
        {
            EventType = "BULK_REMINDERS_DISPATCHED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"Dispatched bulk reminder emails to {employees.Count} recipients (Filter Group: {dto.Group}, Grade: {dto.Grade}).",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Successfully dispatched {employees.Count} reminder emails.", count = employees.Count });
    }
}

public record ReminderDispatchDto(string Group, string Grade, string Subject, string MessageBody, string ActorUserId);
