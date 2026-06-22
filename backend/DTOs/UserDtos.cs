namespace Backend.DTOs;

public record CreateSupplierRequest(
    string Name,
    string Email,
    string Password,
    string? PhoneNumber,
    string? Location,
    bool IsActive,
    DateOnly? ActiveFromDate);

public record UpdateUserRequest(
    string? Name,
    string? Email,
    string? NewPassword,
    string? PhoneNumber,
    string? Location,
    bool? IsActive,
    DateOnly? ActiveFromDate,
    bool? CanLogin);

public record UserResponse(
    int Id,
    string Name,
    string Email,
    string Role,
    bool CanLogin,
    bool IsApproved,
    bool IsActive,
    string? PhoneNumber,
    string? Location,
    DateOnly? ActiveFromDate,
    DateTime CreatedAt);
