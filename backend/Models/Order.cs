namespace Backend.Models;

public enum OrderStatus { Pending, Confirmed, Shipped, Delivered, Cancelled }

public class Order : BaseEntity
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public User Customer { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
    public ICollection<StockAdjustment> StockAdjustments { get; set; } = [];
    public ICollection<OrderFulfillment> Fulfillments { get; set; } = [];
}

public class OrderItem : BaseEntity
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtOrder { get; set; }

    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
