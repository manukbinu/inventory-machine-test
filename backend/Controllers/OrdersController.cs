using Backend.Data;
using Backend.DTOs;
using Backend.Helpers;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
[EnableRateLimiting("api")]
public class OrdersController(AppDbContext db, OrderService orderService, CurrentUserAccessor user) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> PlaceOrder(PlaceOrderRequest req)
    {
        try
        {
            var order = await orderService.PlaceOrderAsync(req, user.RequireUserId());
            return CreatedAtAction(nameof(Get), new { id = order.Id }, new { order.Id, order.Status });
        }
        catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = user.RequireUserId();
        var isAdmin = user.Role == "Admin";
        var isSupplier = user.Role == "Supplier";

        var query = db.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsQueryable();

        if (isAdmin) { }
        else if (isSupplier)
            query = query.Where(o => o.Items.Any(i => i.Product.SupplierId == userId));
        else
            query = query.Where(o => o.CustomerId == userId);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new OrderListResponse(
                o.Id, o.Status.ToString(), o.CreatedAt, o.Customer.Email,
                o.Customer.Name, o.Customer.PhoneNumber, o.Customer.Location,
                o.Items.Sum(i => i.Quantity * i.PriceAtOrder),
                isSupplier
                    ? o.Items.Where(i => i.Product.SupplierId == userId).Sum(i => i.Quantity * i.PriceAtOrder)
                    : (decimal?)null))
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var userId = user.RequireUserId();
        var isAdmin = user.Role == "Admin";
        var isSupplier = user.Role == "Supplier";

        var order = await db.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Fulfillments).ThenInclude(f => f.Supplier)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound();
        if (!isAdmin && !isSupplier && order.CustomerId != userId) return Forbid();
        if (isSupplier && !order.Items.Any(i => i.Product.SupplierId == userId)) return Forbid();

        return Ok(new OrderResponse(
            order.Id, order.Status.ToString(), order.CreatedAt,
            order.Customer.Email, order.Customer.Name,
            order.Customer.PhoneNumber, order.Customer.Location,
            order.Items.Select(i => new OrderItemResponse(
                i.ProductId, i.Product.Name, i.Quantity, i.PriceAtOrder,
                i.Quantity * i.PriceAtOrder, i.Product.SupplierId, i.Product.Supplier.Name)).ToList(),
            order.Items.Sum(i => i.Quantity * i.PriceAtOrder),
            order.Fulfillments.Select(f => new FulfillmentResponse(
                f.SupplierId, f.Supplier.Name, f.Supplier.Email, f.Status.ToString())).ToList()));
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var userId = user.RequireUserId();
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);
        if (order == null) return NotFound("Order not found.");
        if (order.Status.ToString() != "Pending")
            return BadRequest("Only pending orders can be cancelled.");
        try
        {
            await orderService.UpdateStatusAsync(id, "Cancelled", userId);
            return Ok(new { message = "Order cancelled." });
        }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusRequest req)
    {
        try
        {
            await orderService.UpdateStatusAsync(id, req.Status, user.RequireUserId(), user.Role ?? "Admin");
            return Ok(new { message = "Status updated." });
        }
        catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{id}/fulfillment/status")]
    [Authorize(Policy = "SupplierOnly")]
    public async Task<IActionResult> UpdateFulfillmentStatus(int id, UpdateFulfillmentStatusRequest req)
    {
        try
        {
            await orderService.UpdateFulfillmentStatusAsync(id, user.RequireUserId(), req.Status);
            return Ok(new { message = "Fulfillment status updated." });
        }
        catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }
}
