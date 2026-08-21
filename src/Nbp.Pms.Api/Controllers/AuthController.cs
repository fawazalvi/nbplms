using Microsoft.AspNetCore.Mvc;
using Nbp.Pms.Contracts.DTOs;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { code = "INVALID_REQUEST", message = "Username/SAP ID and password are required." });
        }

        // Demo / Pilot authentication response
        var user = new UserDto(
            Id: Guid.NewGuid().ToString(),
            Username: request.Username,
            Email: $"{request.Username}@nbp.com.pk",
            FullName: "Fawaz Ahmed",
            SapId: request.Username,
            Roles: new List<string> { "Employee", "FirstAppraiser" },
            Permissions: new List<string> { "FORM_READ_OWN", "FORM_SUBMIT", "REVIEW_FIRST" },
            MustChangePassword: false
        );

        return Ok(new AuthResultDto(true, "Authentication successful", user));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        var user = new UserDto(
            Id: Guid.NewGuid().ToString(),
            Username: "84920",
            Email: "84920@nbp.com.pk",
            FullName: "Fawaz Ahmed",
            SapId: "84920",
            Roles: new List<string> { "Employee", "FirstAppraiser" },
            Permissions: new List<string> { "FORM_READ_OWN", "FORM_SUBMIT", "REVIEW_FIRST" },
            MustChangePassword: false
        );

        return Ok(user);
    }
}
