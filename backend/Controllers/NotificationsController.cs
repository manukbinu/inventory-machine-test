using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

record NotificationDto(int Id, string Type, string Message, bool IsRead, int? RelatedEntityId, DateTime CreatedAt);

[ApiController]
[Route("api/notifications")]
[Authorize]
[EnableRateLimiting("api")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirst("uid")!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await db.Notifications
            .Where(n => n.UserId == UserId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDto(n.Id, n.Type, n.Message, n.IsRead, n.RelatedEntityId, n.CreatedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId);
        if (n == null) return NotFound();
        n.IsRead = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notifications
            .Where(n => n.UserId == UserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId);
        if (n == null) return NotFound();
        n.IsDeleted = true;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
