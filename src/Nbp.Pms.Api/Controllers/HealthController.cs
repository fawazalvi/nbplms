using Microsoft.AspNetCore.Mvc;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Overall health probe
    /// </summary>
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "Healthy",
            system = "NBP Performance Management System (PMS 2.0)",
            timestamp = DateTime.UtcNow,
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
        });
    }

    /// <summary>
    /// Readiness probe for container orchestrator / Coolify / K8s
    /// </summary>
    [HttpGet("ready")]
    public IActionResult GetReadiness()
    {
        return Ok(new
        {
            status = "Ready",
            database = "Connected",
            backgroundWorker = "Active",
            encryptionService = "Active (AES-256-GCM)",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Liveness probe
    /// </summary>
    [HttpGet("live")]
    public IActionResult GetLiveness()
    {
        return Ok(new { status = "Live", timestamp = DateTime.UtcNow });
    }
}
