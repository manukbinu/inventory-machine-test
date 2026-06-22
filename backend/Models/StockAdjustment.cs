namespace Backend.Models;

public enum AdjustmentType { Restock, Removal, OrderDeduct, CancelRestore }

public class StockAdjustment : BaseEntity
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public AdjustmentType AdjustmentType { get; set; }
    public int StockBefore { get; set; }
    public int QuantityChanged { get; set; }
    public int StockAfter { get; set; }
    public string? Reason { get; set; }
    public int AdjustedBy { get; set; }
    public DateTime AdjustedAt { get; set; }
    public int? RelatedOrderId { get; set; }

    public Product Product { get; set; } = null!;
    public User Adjuster { get; set; } = null!;
    public Order? RelatedOrder { get; set; }
}
