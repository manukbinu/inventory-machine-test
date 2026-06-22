namespace Backend.Models;

public enum FulfillmentStatus { Pending, Processing, Shipped, Cancelled }

public class OrderFulfillment : BaseEntity
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int SupplierId { get; set; }
    public FulfillmentStatus Status { get; set; } = FulfillmentStatus.Pending;

    public Order Order { get; set; } = null!;
    public User Supplier { get; set; } = null!;
}
