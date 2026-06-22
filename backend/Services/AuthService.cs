using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public class AuthService(AppDbContext db, IConfiguration config)
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = UserRole.Customer,
            PhoneNumber = req.PhoneNumber,
            Location = req.Address
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return new AuthResponse(GenerateToken(user), user.Role.ToString(), user.Id, user.Name, user.Email, user.IsApproved);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.CanLogin)
            throw new UnauthorizedAccessException("Account login is disabled.");

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials.");

        return new AuthResponse(GenerateToken(user), user.Role.ToString(), user.Id, user.Name, user.Email, user.IsApproved);
    }

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("uid", user.Id.ToString()),
            new Claim("role", user.Role.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("isApproved", user.IsApproved.ToString().ToLower()),
            new Claim("name", user.Name)
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
