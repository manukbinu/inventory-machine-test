using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AuditLogAction> AuditLogActions => Set<AuditLogAction>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderFulfillment> OrderFulfillments => Set<OrderFulfillment>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Global soft-delete filters
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Product>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<StockAdjustment>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Order>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<OrderItem>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<OrderFulfillment>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Notification>().HasQueryFilter(e => !e.IsDeleted);

        // AuditLog — no soft delete filter, immutable
        modelBuilder.Entity<AuditLog>().ToTable("AuditLogs");
        modelBuilder.Entity<AuditLogAction>().ToTable("AuditLogActions");

        // User self-referencing FK for audit columns — ignore cycle
        modelBuilder.Entity<User>()
            .HasMany<Product>(u => u.Products)
            .WithOne(p => p.Supplier)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasMany<Order>(u => u.Orders)
            .WithOne(o => o.Customer)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockAdjustment>()
            .HasOne(s => s.Adjuster)
            .WithMany()
            .HasForeignKey(s => s.AdjustedBy)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockAdjustment>()
            .HasOne(s => s.RelatedOrder)
            .WithMany(o => o.StockAdjustments)
            .HasForeignKey(s => s.RelatedOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Changer)
            .WithMany()
            .HasForeignKey(a => a.ChangedBy)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Enums stored as strings
        modelBuilder.Entity<User>().Property(u => u.Role).HasConversion<string>();
        modelBuilder.Entity<Order>().Property(o => o.Status).HasConversion<string>();
        modelBuilder.Entity<OrderFulfillment>().Property(f => f.Status).HasConversion<string>();
        modelBuilder.Entity<OrderFulfillment>()
            .HasOne(f => f.Order).WithMany(o => o.Fulfillments)
            .HasForeignKey(f => f.OrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrderFulfillment>()
            .HasOne(f => f.Supplier).WithMany()
            .HasForeignKey(f => f.SupplierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockAdjustment>().Property(s => s.AdjustmentType).HasConversion<string>();

        // Decimal precision
        modelBuilder.Entity<Product>().Property(p => p.CostPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Product>().Property(p => p.SellingPrice).HasPrecision(18, 2);
        modelBuilder.Entity<OrderItem>().Property(oi => oi.PriceAtOrder).HasPrecision(18, 2);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;

        var entries = ChangeTracker.Entries<BaseEntity>().ToList();
        var auditEntries = new List<(EntityEntry<BaseEntity> Entry, string Action, Dictionary<string, (string? Old, string? New)> Changes)>();

        foreach (var entry in entries)
        {
            if (entry.Entity is Notification) continue;

            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = userId;
                auditEntries.Add((entry, "Created", []));
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.ModifiedAt = now;
                entry.Entity.ModifiedBy = userId;

                var changes = new Dictionary<string, (string? Old, string? New)>();
                foreach (var prop in entry.Properties)
                {
                    if (prop.IsModified && prop.Metadata.Name != nameof(BaseEntity.ModifiedAt) && prop.Metadata.Name != nameof(BaseEntity.ModifiedBy))
                        changes[prop.Metadata.Name] = (prop.OriginalValue?.ToString(), prop.CurrentValue?.ToString());
                }
                auditEntries.Add((entry, "Updated", changes));
            }
            else if (entry.State == EntityState.Deleted)
            {
                // Convert hard delete to soft delete
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = now;
                entry.Entity.DeletedBy = userId;
                auditEntries.Add((entry, "Deleted", []));
            }
        }

        var result = await base.SaveChangesAsync(cancellationToken);
        await WriteAuditLogsAsync(auditEntries, userId, now);
        return result;
    }

    private async Task WriteAuditLogsAsync(
        List<(EntityEntry<BaseEntity> Entry, string Action, Dictionary<string, (string? Old, string? New)> Changes)> entries,
        int? userId, DateTime now)
    {
        if (entries.Count == 0 || userId == null) return;

        var ip = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        var ua = httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();

        foreach (var (entry, action, changes) in entries)
        {
            var recordId = (int)(entry.Property("Id").CurrentValue ?? 0);
            if (recordId == 0) continue;

            var log = new AuditLog
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Metadata.ClrType.Name,
                RecordId = recordId,
                ActionType = action,
                ChangedBy = userId.Value,
                ChangedAt = now,
                IpAddress = ip,
                UserAgent = ua
            };

            AuditLogs.Add(log);
            await base.SaveChangesAsync();

            foreach (var (field, (old, newVal)) in changes)
            {
                AuditLogActions.Add(new AuditLogAction
                {
                    AuditLogId = log.Id,
                    FieldName = field,
                    OldValue = old,
                    NewValue = newVal
                });
            }

            if (changes.Count > 0)
                await base.SaveChangesAsync();
        }
    }

    public Task<int> SaveChangesWithoutAuditAsync() => base.SaveChangesAsync();

    private int? GetCurrentUserId()
    {
        var claim = httpContextAccessor.HttpContext?.User?.FindFirst("uid")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}
