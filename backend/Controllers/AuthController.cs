using Backend.Data;
using Backend.DTOs;
using Backend.Helpers;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(AuthService authService, AppDbContext db, CurrentUserAccessor currentUser) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        try { return Ok(await authService.RegisterAsync(req)); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        try { return Ok(await authService.LoginAsync(req)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(ex.Message); }
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateUserRequest req)
    {
        var userId = currentUser.RequireUserId();
        var u = await db.Users.FindAsync(userId);
        if (u == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Email) && req.Email != u.Email)
        {
            if (await db.Users.AnyAsync(x => x.Email == req.Email && x.Id != userId))
                return Conflict("Email already in use.");
            u.Email = req.Email;
        }
        if (!string.IsNullOrWhiteSpace(req.Name)) u.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.NewPassword)) u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        if (req.PhoneNumber != null) u.PhoneNumber = req.PhoneNumber;
        if (req.Location != null) u.Location = req.Location;

        await db.SaveChangesAsync();
        return Ok(new { message = "Profile updated." });
    }
}
