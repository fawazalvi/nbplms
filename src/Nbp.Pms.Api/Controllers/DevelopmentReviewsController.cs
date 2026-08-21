using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DevelopmentReviewsController : ControllerBase
{
    private readonly PmsDbContext _db;

    public DevelopmentReviewsController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet("{employeeCycleId}")]
    public async Task<IActionResult> GetDevelopmentReview(Guid employeeCycleId)
    {
        var devReview = await _db.DevelopmentReviews
            .FirstOrDefaultAsync(dr => dr.EmployeeCycleId == employeeCycleId);

        if (devReview == null) return NotFound(new { message = "Development Review form not found." });

        return Ok(devReview);
    }

    [HttpPost]
    public async Task<IActionResult> SaveDevelopmentReview([FromBody] DevelopmentReview review)
    {
        var existing = await _db.DevelopmentReviews
            .FirstOrDefaultAsync(dr => dr.EmployeeCycleId == review.EmployeeCycleId);

        if (existing == null)
        {
            review.Id = Guid.NewGuid();
            _db.DevelopmentReviews.Add(review);
        }
        else
        {
            existing.KeyStrengths = review.KeyStrengths;
            existing.DevelopmentAreas = review.DevelopmentAreas;
            existing.TrainingActionPlan = review.TrainingActionPlan;
            existing.SupervisorComments = review.SupervisorComments;
            existing.IsSubmitted = review.IsSubmitted;
            if (review.IsSubmitted) existing.SubmittedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Development Review saved successfully." });
    }
}
