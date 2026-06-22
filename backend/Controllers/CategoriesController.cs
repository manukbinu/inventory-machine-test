using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Controllers;

[ApiController]
[Route("api/categories")]
[EnableRateLimiting("api")]
public class CategoriesController(AppDbContext db, IMemoryCache cache) : ControllerBase
{
    private const string CacheKey = "categories";

    private static CategoryResponse ToResponse(Category c, int activeProductCount) =>
        new(c.Id, c.Name, c.Description, c.CreatedAt, activeProductCount);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (cache.TryGetValue(CacheKey, out object? cached))
            return Ok(cached);

        var counts = await db.Products
            .GroupBy(p => p.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

        var categories = await db.Categories.ToListAsync();
        var result = categories.Select(c => ToResponse(c, counts.GetValueOrDefault(c.Id, 0)));

        cache.Set(CacheKey, result, TimeSpan.FromMinutes(10));
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var c = await db.Categories.FindAsync(id);
        if (c == null) return NotFound();
        var count = await db.Products.CountAsync(p => p.CategoryId == id);
        return Ok(ToResponse(c, count));
    }

    [HttpPost]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> Create(CategoryRequest req)
    {
        var category = new Category { Name = req.Name, Description = req.Description };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        cache.Remove(CacheKey);
        return CreatedAtAction(nameof(Get), new { id = category.Id }, ToResponse(category, 0));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> Update(int id, CategoryRequest req)
    {
        var category = await db.Categories.FindAsync(id);
        if (category == null) return NotFound();
        category.Name = req.Name;
        category.Description = req.Description;
        await db.SaveChangesAsync();
        cache.Remove(CacheKey);
        var count = await db.Products.CountAsync(p => p.CategoryId == id);
        return Ok(ToResponse(category, count));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOrSupplier")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category == null) return NotFound();

        var activeProductCount = await db.Products.CountAsync(p => p.CategoryId == id);
        if (activeProductCount > 0)
            return Conflict($"Cannot delete \"{category.Name}\" — {activeProductCount} active product(s) are linked to it.");

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        cache.Remove(CacheKey);
        return NoContent();
    }
}
