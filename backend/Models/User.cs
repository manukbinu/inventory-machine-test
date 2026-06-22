namespace Backend.Models;

public enum UserRole { Admin, Supplier, Customer }

public class User : BaseEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool CanLogin { get; set; } = true;

    // Supplier-only fields (nullable for other roles)
    public bool IsApproved { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public string? PhoneNumber { get; set; }
    public string? Location { get; set; }
    public DateOnly? ActiveFromDate { get; set; }

    // Navigation
    public ICollection<Product> Products { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}
