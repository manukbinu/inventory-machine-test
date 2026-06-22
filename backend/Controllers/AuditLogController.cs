using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "AdminOnly")]
[EnableRateLimiting("api")]
public class AuditLogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? tableName,
        [FromQuery] string? actionType,
        [FromQuery] string? changedByEmail,
        [FromQuery] int? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = db.AuditLogs.Include(a => a.Changer).AsQueryable();

        if (!string.IsNullOrEmpty(tableName)) query = query.Where(a => a.TableName == tableName);
        if (!string.IsNullOrEmpty(actionType)) query = query.Where(a => a.ActionType == actionType);
        if (!string.IsNullOrEmpty(changedByEmail)) query = query.Where(a => a.Changer!.Email.Contains(changedByEmail));
        if (userId.HasValue) query = query.Where(a => a.ChangedBy == userId);
        if (from.HasValue) query = query.Where(a => a.ChangedAt >= from);
        if (to.HasValue) query = query.Where(a => a.ChangedAt <= to);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.ChangedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogResponse(a.Id, a.TableName, a.RecordId, a.ActionType, a.Changer!.Email, a.ChangedAt, a.IpAddress))
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var log = await db.AuditLogs
            .Include(a => a.Changer)
            .Include(a => a.Actions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (log == null) return NotFound();

        return Ok(new AuditLogDetailResponse(
            log.Id, log.TableName, log.RecordId, log.ActionType,
            log.Changer!.Email, log.ChangedAt, log.IpAddress,
            log.Actions.Select(a => new AuditLogActionResponse(a.FieldName, a.OldValue, a.NewValue)).ToList()));
    }
}
