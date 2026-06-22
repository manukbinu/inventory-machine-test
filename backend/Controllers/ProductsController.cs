using Backend.Data;
using Backend.DTOs;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/products")]
[EnableRateLimiting("api")]
public class ProductsController(AppDbContext db, CurrentUserAccessor user, StockService stockService, ImageService imageService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProductFilterRequest filter)
    {
        var query = db.Products
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (filter.CategoryId.HasValue) query = query.Where(p => p.CategoryId == filter.CategoryId);
        if (filter.SupplierId.HasValue) query = query.Where(p => p.SupplierId == filter.SupplierId);
        if (filter.MinPrice.HasValue) query = query.Where(p => p.SellingPrice >= filter.MinPrice);
        if (filter.MaxPrice.HasValue) query = query.Where(p => p.SellingPrice <= filter.MaxPrice);
        if (filter.InStock == true) query = query.Where(p => p.CurrentStock > 0);
        if (!string.IsNullOrEmpty(filter.Search))
            query = query.Where(p => p.Name.Contains(filter.Search) || (p.Description != null && p.Description.Contains(filter.Search)));

        var total = await query.CountAsync();
        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new ProductListResponse(p.Id, p.Name, p.SellingPrice, p.Unit, p.CurrentStock, p.ImageUrl, p.Category.Name, p.Supplier.Email))
            .ToListAsync();

        return Ok(new PagedResult<ProductListResponse>(items, total, filter.Page, filter.PageSize));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await db.Products.Include(p => p.Category).Include(p => p.Supplier).FirstOrDefaultAsync(p => p.Id == id);
        if (p == null) return NotFound();
        return Ok(MapProduct(p));
    }

    [HttpPost]
    [Authorize(Policy = "SupplierOnly")]
    public async Task<IActionResult> Create([FromForm] CreateProductRequest req, IFormFile? image)
    {
        var supplierId = user.RequireUserId();
        var supplier = await db.Users.FindAsync(supplierId);
        if (supplier == null || !supplier.IsApproved)
            return StatusCode(403, "Your supplier account is pending approval. Please wait for Admin approval before listing products.");

        if (req.SellingPrice <= req.CostPrice)
            return BadRequest("Selling price must be greater than cost price.");

        var product = new Product
        {
            Name = req.Name,
            Description = req.Description,
            CostPrice = req.CostPrice,
            SellingPrice = req.SellingPrice,
            Unit = req.Unit,
            OpeningStock = req.OpeningStock,
            CurrentStock = req.OpeningStock,
            CategoryId = req.CategoryId,
            SupplierId = supplierId
        };

        if (image != null)
            product.ImageUrl = await imageService.SaveAsync(image);

        db.Products.Add(product);
        await db.SaveChangesAsync();

        var created = await db.Products.Include(p => p.Category).Include(p => p.Supplier).FirstAsync(p => p.Id == product.Id);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, MapProduct(created));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateProductRequest req, IFormFile? image)
    {
        var product = await db.Products.Include(p => p.Category).Include(p => p.Supplier).FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return NotFound();

        var userId = user.RequireUserId();
        var role = user.Role;

        if (role != "Admin" && product.SupplierId != userId)
            return Forbid();

        if (req.SellingPrice <= req.CostPrice)
            return BadRequest("Selling price must be greater than cost price.");

        if (image != null)
        {
            imageService.Delete(product.ImageUrl);
            product.ImageUrl = await imageService.SaveAsync(image);
        }

        product.Name = req.Name;
        product.Description = req.Description;
        product.CostPrice = req.CostPrice;
        product.SellingPrice = req.SellingPrice;
        product.Unit = req.Unit;
        product.CategoryId = req.CategoryId;

        await db.SaveChangesAsync();

        var updated = await db.Products.Include(p => p.Category).Include(p => p.Supplier).FirstAsync(p => p.Id == id);
        return Ok(MapProduct(updated));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound();

        var userId = user.RequireUserId();
        if (user.Role != "Admin" && product.SupplierId != userId)
            return Forbid();

        imageService.Delete(product.ImageUrl);
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/stock-adjustment")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> StockAdjust(int id, StockAdjustmentRequest req)
    {
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound();

        var userId = user.RequireUserId();
        if (user.Role != "Admin" && product.SupplierId != userId)
            return Forbid();

        var type = req.QuantityChanged >= 0 ? AdjustmentType.Restock : AdjustmentType.Removal;

        try
        {
            await stockService.AdjustAsync(id, req.QuantityChanged, req.Reason, type, userId);
            return Ok(new { message = "Stock adjusted successfully." });
        }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpGet("{id}/stock-history")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> StockHistory(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound();

        var userId = user.RequireUserId();
        if (user.Role != "Admin" && product.SupplierId != userId)
            return Forbid();

        var history = await db.StockAdjustments
            .Include(s => s.Adjuster)
            .Where(s => s.ProductId == id)
            .OrderByDescending(s => s.AdjustedAt)
            .Select(s => new StockAdjustmentResponse(
                s.Id, s.AdjustmentType.ToString(), s.StockBefore, s.QuantityChanged, s.StockAfter,
                s.Reason, s.AdjustedAt, s.Adjuster.Email))
            .ToListAsync();

        return Ok(history);
    }

    private static ProductResponse MapProduct(Product p) =>
        new(p.Id, p.Name, p.Description, p.CostPrice, p.SellingPrice, p.Unit,
            p.OpeningStock, p.CurrentStock, p.ImageUrl,
            p.CategoryId, p.Category.Name, p.SupplierId, p.Supplier.Email, p.CreatedAt);
}
