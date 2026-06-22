using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
[EnableRateLimiting("api")]
public class AdminController(AppDbContext db, IMemoryCache cache) : ControllerBase
{
    // --- User Management ---

    private static UserResponse ToResponse(User u) =>
        new(u.Id, u.Name, u.Email, u.Role.ToString(), u.CanLogin, u.IsApproved, u.IsActive,
            u.PhoneNumber, u.Location, u.ActiveFromDate, u.CreatedAt);

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role = null)
    {
        var query = db.Users.AsQueryable();
        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
            query = query.Where(u => u.Role == roleEnum);
        return Ok((await query.ToListAsync()).Select(ToResponse));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateSupplier(CreateSupplierRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict("Email already registered.");

        var supplier = new User
        {
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = UserRole.Supplier,
            CanLogin = true,
            IsApproved = false,
            IsActive = req.IsActive,
            PhoneNumber = req.PhoneNumber,
            Location = req.Location,
            ActiveFromDate = req.ActiveFromDate
        };

        db.Users.Add(supplier);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUsers), new { }, ToResponse(supplier));
    }

    [HttpPost("users/{id}/approve")]
    public async Task<IActionResult> ApproveSupplier(int id)
    {
        var u = await db.Users.FindAsync(id);
        if (u == null) return NotFound();
        if (u.Role != UserRole.Supplier) return BadRequest("Only suppliers can be approved.");
        u.IsApproved = true;
        await db.SaveChangesAsync();
        return Ok(ToResponse(u));
    }

    [HttpPost("users/{id}/revoke")]
    public async Task<IActionResult> RevokeSupplier(int id)
    {
        var u = await db.Users.FindAsync(id);
        if (u == null) return NotFound();
        if (u.Role != UserRole.Supplier) return BadRequest("Only suppliers can be revoked.");
        u.IsApproved = false;
        await db.SaveChangesAsync();
        return Ok(ToResponse(u));
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserRequest req)
    {
        var u = await db.Users.FindAsync(id);
        if (u == null) return NotFound();

        if (req.Name != null) u.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Email) && req.Email != u.Email)
        {
            if (await db.Users.AnyAsync(x => x.Email == req.Email && x.Id != u.Id))
                return Conflict("Email already in use.");
            u.Email = req.Email;
        }
        if (!string.IsNullOrWhiteSpace(req.NewPassword))
            u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        if (req.PhoneNumber != null) u.PhoneNumber = req.PhoneNumber;
        if (req.Location != null) u.Location = req.Location;
        if (req.IsActive.HasValue) u.IsActive = req.IsActive.Value;
        if (req.ActiveFromDate.HasValue) u.ActiveFromDate = req.ActiveFromDate;
        if (req.CanLogin.HasValue) u.CanLogin = req.CanLogin.Value;

        await db.SaveChangesAsync();
        return Ok(ToResponse(u));
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var u = await db.Users.FindAsync(id);
        if (u == null) return NotFound();
        db.Users.Remove(u);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // --- Dashboard ---

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        if (cache.TryGetValue("dashboard", out object? cached))
            return Ok(cached);

        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = now.AddDays(-30);

        // --- KPIs ---
        var allOrders = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Product).Include(o => o.Customer).ToListAsync();
        var deliveredOrders = allOrders.Where(o => o.Status == OrderStatus.Delivered).ToList();

        int totalOrdersToday = allOrders.Count(o => o.CreatedAt >= todayStart);
        int totalOrdersMonth = allOrders.Count(o => o.CreatedAt >= monthStart);

        decimal revenueToday = deliveredOrders
            .Where(o => o.CreatedAt >= todayStart)
            .SelectMany(o => o.Items).Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice));
        decimal revenueMonth = deliveredOrders
            .Where(o => o.CreatedAt >= monthStart)
            .SelectMany(o => o.Items).Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice));

        int pendingCount = allOrders.Count(o => o.Status == OrderStatus.Pending);

        var allProducts = await db.Products.Include(p => p.Supplier).Include(p => p.Category).ToListAsync();
        int lowStockCount = allProducts.Count(p => p.CurrentStock > 0 && p.CurrentStock < 10);
        int outOfStockCount = allProducts.Count(p => p.CurrentStock == 0);

        int totalCustomers = await db.Users.CountAsync(u => u.Role == UserRole.Customer);
        int totalSuppliers = await db.Users.CountAsync(u => u.Role == UserRole.Supplier);

        var allOrderItems = await db.OrderItems.Include(i => i.Product).ThenInclude(p => p.Supplier).Include(i => i.Order).ToListAsync();
        var deliveredItems = allOrderItems.Where(i => i.Order.Status == OrderStatus.Delivered).ToList();

        decimal aov = deliveredOrders.Count > 0
            ? deliveredOrders.Average(o => o.Items.Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice)))
            : 0;

        // --- Low/Out of Stock ---
        var lowStockProducts = allProducts
            .Where(p => p.CurrentStock > 0 && p.CurrentStock < 10)
            .Select(p => new LowStockProduct(p.Id, p.Name, p.CurrentStock, p.Supplier.Email))
            .ToList();

        var outOfStockProducts = allProducts
            .Where(p => p.CurrentStock == 0)
            .Select(p => new OutOfStockProduct(p.Id, p.Name, p.Supplier.Email))
            .ToList();

        // --- Orders per day (last 30 days) ---
        var recentOrders30 = allOrders.Where(o => o.CreatedAt >= thirtyDaysAgo).ToList();
        var ordersPerDay = recentOrders30
            .GroupBy(o => DateOnly.FromDateTime(o.CreatedAt))
            .Select(g => new OrdersPerDay(g.Key, g.Count()))
            .OrderBy(x => x.Date).ToList();

        // --- Revenue per day (last 30 days, delivered only) ---
        var revenuePerDay = deliveredOrders
            .Where(o => o.CreatedAt >= thirtyDaysAgo)
            .GroupBy(o => DateOnly.FromDateTime(o.CreatedAt))
            .Select(g => new RevenuePerDay(g.Key, g.SelectMany(o => o.Items).Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice))))
            .OrderBy(x => x.Date).ToList();

        // --- Revenue per supplier (delivered only) ---
        var revenuePerSupplier = deliveredItems
            .GroupBy(i => new { i.Product.Supplier.Email, i.Product.Supplier.Name })
            .Select(g => new RevenuePerSupplier(g.Key.Email, g.Key.Name, g.Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice))))
            .OrderByDescending(x => x.Revenue).ToList();

        // --- Orders by status ---
        var ordersByStatus = allOrders
            .GroupBy(o => o.Status.ToString())
            .Select(g => new OrdersByStatus(g.Key, g.Count()))
            .ToList();

        // --- Category product distribution ---
        var categoryProductCounts = allProducts
            .Where(p => p.Category != null)
            .GroupBy(p => p.Category.Name)
            .Select(g => new CategoryProductCount(g.Key, g.Count()))
            .OrderByDescending(x => x.ProductCount).ToList();

        // --- Top selling products (delivered only) ---
        var topSelling = deliveredItems
            .GroupBy(i => new { i.ProductId, i.Product.Name })
            .Select(g => new TopSellingProduct(g.Key.ProductId, g.Key.Name, g.Sum(i => i.Quantity), g.Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice))))
            .OrderByDescending(x => x.TotalSold).Take(10).ToList();

        // --- Supplier order counts (delivered only) ---
        var supplierOrderCounts = deliveredItems
            .GroupBy(i => new { i.Product.Supplier.Email, i.Product.Supplier.Name })
            .Select(g => new SupplierOrderCount(
                g.Key.Name, g.Key.Email,
                g.Select(i => i.OrderId).Distinct().Count(),
                g.Sum(i => i.Quantity * (i.PriceAtOrder - i.Product.CostPrice))))
            .OrderByDescending(x => x.OrderCount).ToList();

        // --- Recent orders (last 15) ---
        var recentOrdersList = allOrders
            .OrderByDescending(o => o.CreatedAt).Take(15)
            .Select(o => new RecentOrder(o.Id, o.Customer?.Name ?? o.Customer?.Email ?? "",
                o.Status.ToString(), o.CreatedAt,
                o.Items.Sum(i => i.Quantity * i.PriceAtOrder)))
            .ToList();

        var result = new DashboardResponse(
            totalOrdersToday, totalOrdersMonth, revenueToday, revenueMonth,
            lowStockCount, outOfStockCount, totalCustomers, totalSuppliers, pendingCount, aov,
            lowStockProducts, outOfStockProducts, ordersPerDay, revenuePerDay,
            revenuePerSupplier, ordersByStatus, categoryProductCounts,
            topSelling, supplierOrderCounts, recentOrdersList);

        cache.Set("dashboard", result, TimeSpan.FromMinutes(5));
        return Ok(result);
    }
}
