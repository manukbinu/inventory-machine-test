namespace Backend.Models;

public class Product : BaseEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public string Unit { get; set; } = string.Empty;
    public int OpeningStock { get; set; }
    public int CurrentStock { get; set; }
    public string? ImageUrl { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public int SupplierId { get; set; }
    public User Supplier { get; set; } = null!;

    public ICollection<OrderItem> OrderItems { get; set; } = [];
    public ICollection<StockAdjustment> StockAdjustments { get; set; } = [];
}
