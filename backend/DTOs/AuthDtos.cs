namespace Backend.DTOs;

public record RegisterRequest(string Name, string Email, string Password, string? PhoneNumber, string? Address);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, string Role, int UserId, string Name, string Email, bool IsApproved, string? PhoneNumber, string? Location);
