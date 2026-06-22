using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class OrderService(AppDbContext db, StockService stockService, NotificationService notificationService)
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> AllowedTransitions = new()
    {
        [OrderStatus.Pending]   = [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed] = [OrderStatus.Shipped,   OrderStatus.Cancelled],
        [OrderStatus.Shipped]   = [OrderStatus.Delivered],
        [OrderStatus.Delivered] = [],
        [OrderStatus.Cancelled] = []
    };

    private static readonly Dictionary<FulfillmentStatus, FulfillmentStatus[]> FulfillmentTransitions = new()
    {
        [FulfillmentStatus.Pending]    = [FulfillmentStatus.Processing],
        [FulfillmentStatus.Processing] = [FulfillmentStatus.Shipped],
        [FulfillmentStatus.Shipped]    = [],
        [FulfillmentStatus.Cancelled]  = []
    };

    // Returns all admin user IDs
    private Task<List<int>> GetAdminIdsAsync() =>
        db.Users.Where(u => u.Role == UserRole.Admin && !u.IsDeleted).Select(u => u.Id).ToListAsync();

    public async Task<Order> PlaceOrderAsync(PlaceOrderRequest req, int customerId)
    {
        var customerExists = await db.Users.AnyAsync(u => u.Id == customerId);
        if (!customerExists)
            throw new KeyNotFoundException("Customer account not found. Please log out and log in again.");

        await using var tx = await db.Database.BeginTransactionAsync();

        var order = new Order { CustomerId = customerId, Status = OrderStatus.Pending };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        // Track which products belong to which supplier
        var supplierProducts = new Dictionary<int, List<string>>(); // supplierId → product names

        foreach (var item in req.Items)
        {
            var product = await db.Products.FindAsync(item.ProductId)
                ?? throw new KeyNotFoundException($"Product {item.ProductId} not found.");

            db.OrderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                PriceAtOrder = product.SellingPrice
            });
            await db.SaveChangesAsync();

            if (!supplierProducts.ContainsKey(product.SupplierId))
                supplierProducts[product.SupplierId] = new List<string>();
            supplierProducts[product.SupplierId].Add(product.Name);

            await stockService.AdjustAsync(
                item.ProductId, -item.Quantity,
                $"Order #{order.Id}",
                AdjustmentType.OrderDeduct,
                customerId,
                order.Id);
        }

        // Create one fulfillment per unique supplier
        foreach (var sid in supplierProducts.Keys)
        {
            db.OrderFulfillments.Add(new OrderFulfillment
            {
                OrderId = order.Id,
                SupplierId = sid,
                Status = FulfillmentStatus.Pending
            });
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        // Count customer's total orders
        var customerOrderCount = await db.Orders.CountAsync(o => o.CustomerId == customerId);
        await notificationService.CreateAsync(customerId, "OrderPlaced",
            $"You have placed {customerOrderCount} order(s) so far. Your latest order is confirmed.", order.Id);

        // Notify each involved supplier — count of their products in this order
        foreach (var (sid, products) in supplierProducts)
        {
            var productList = string.Join(", ", products);
            await notificationService.CreateAsync(sid, "OrderPlaced",
                $"{products.Count} of your product(s) were ordered: {productList}.", order.Id);
        }

        // Notify all admins — total order count
        var totalOrders = await db.Orders.CountAsync();
        var adminIds = await GetAdminIdsAsync();
        foreach (var aid in adminIds)
            await notificationService.CreateAsync(aid, "OrderPlaced",
                $"A new order was placed. Total orders in system: {totalOrders}.", order.Id);

        return order;
    }

    public async Task UpdateStatusAsync(int orderId, string newStatusStr, int userId)
    {
        if (!Enum.TryParse<OrderStatus>(newStatusStr, true, out var newStatus))
            throw new ArgumentException($"Invalid status: {newStatusStr}");

        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Fulfillments)
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new KeyNotFoundException("Order not found.");

        if (!AllowedTransitions[order.Status].Contains(newStatus))
            throw new InvalidOperationException($"Cannot transition from {order.Status} to {newStatus}.");

        order.Status = newStatus;
        await db.SaveChangesAsync();

        if (newStatus == OrderStatus.Cancelled)
        {
            foreach (var f in order.Fulfillments)
                f.Status = FulfillmentStatus.Cancelled;
            await db.SaveChangesAsync();

            foreach (var item in order.Items)
            {
                await stockService.AdjustAsync(
                    item.ProductId, item.Quantity,
                    $"Order #{orderId} cancelled",
                    AdjustmentType.CancelRestore,
                    userId,
                    orderId);
            }
        }

        // Customer: their total order count
        var customerOrderCount = await db.Orders.CountAsync(o => o.CustomerId == order.CustomerId);
        await notificationService.CreateAsync(order.CustomerId, "OrderStatusChanged",
            $"One of your {customerOrderCount} order(s) status has been updated to {newStatus}.", orderId);

        // Each involved supplier: count of their products in this order
        var supplierProducts = order.Items
            .GroupBy(i => i.Product.SupplierId)
            .ToDictionary(g => g.Key, g => g.Select(i => i.Product.Name).ToList());

        foreach (var (sid, products) in supplierProducts)
        {
            var productList = string.Join(", ", products);
            await notificationService.CreateAsync(sid, "OrderStatusChanged",
                $"An order with {products.Count} of your product(s) ({productList}) changed to {newStatus}.", orderId);
        }

        // Admins: total order count (skip actor if already admin)
        var totalOrders = await db.Orders.CountAsync();
        var adminIds = await GetAdminIdsAsync();
        foreach (var aid in adminIds.Where(a => a != userId))
            await notificationService.CreateAsync(aid, "OrderStatusChanged",
                $"An order status changed to {newStatus}. Total orders in system: {totalOrders}.", orderId);
    }

    public async Task UpdateFulfillmentStatusAsync(int orderId, int supplierId, string newStatusStr)
    {
        if (!Enum.TryParse<FulfillmentStatus>(newStatusStr, true, out var newStatus))
            throw new ArgumentException($"Invalid fulfillment status: {newStatusStr}");

        var fulfillment = await db.OrderFulfillments
            .FirstOrDefaultAsync(f => f.OrderId == orderId && f.SupplierId == supplierId)
            ?? throw new KeyNotFoundException("Fulfillment not found.");

        if (!FulfillmentTransitions[fulfillment.Status].Contains(newStatus))
            throw new InvalidOperationException($"Cannot transition fulfillment from {fulfillment.Status} to {newStatus}.");

        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Fulfillments)
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.Delivered)
            throw new InvalidOperationException("Order is already finalized.");

        fulfillment.Status = newStatus;
        await db.SaveChangesAsync();

        // Products belonging to this supplier in this order
        var myProducts = order.Items
            .Where(i => i.Product.SupplierId == supplierId)
            .Select(i => i.Product.Name)
            .ToList();
        var productList = string.Join(", ", myProducts);

        var msg = $"Order #{orderId} fulfillment updated to {newStatus} for product(s): {productList}.";

        // Customer: their total order count
        var customerOrderCount = await db.Orders.CountAsync(o => o.CustomerId == order.CustomerId);
        await notificationService.CreateAsync(order.CustomerId, "OrderStatusChanged",
            $"One of your {customerOrderCount} order(s) was updated by your supplier (fulfillment: {newStatus}).", orderId);

        // Admins: total order count
        var totalOrders = await db.Orders.CountAsync();
        var adminIds = await GetAdminIdsAsync();
        foreach (var aid in adminIds)
            await notificationService.CreateAsync(aid, "OrderStatusChanged",
                $"A supplier updated fulfillment to {newStatus}. Total orders: {totalOrders}.", orderId);

        // Auto-advance order to Shipped when all fulfillments are Shipped
        if (newStatus == FulfillmentStatus.Shipped)
        {
            var allShipped = order.Fulfillments.All(f => f.Status == FulfillmentStatus.Shipped);
            if (allShipped && order.Status == OrderStatus.Confirmed)
            {
                order.Status = OrderStatus.Shipped;
                await db.SaveChangesAsync();

                await notificationService.CreateAsync(order.CustomerId, "OrderStatusChanged",
                    $"One of your {customerOrderCount} order(s) has been fully shipped!", orderId);
                foreach (var aid in adminIds)
                    await notificationService.CreateAsync(aid, "OrderStatusChanged",
                        $"An order has been fully shipped. Total orders: {totalOrders}.", orderId);
            }
        }
    }
}
