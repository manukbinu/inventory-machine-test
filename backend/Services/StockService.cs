using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class StockService(AppDbContext db, NotificationService notificationService)
{
    public async Task AdjustAsync(int productId, int quantityChanged, string? reason, AdjustmentType type, int adjustedBy, int? relatedOrderId = null)
    {
        // If a transaction is already active (e.g. called from OrderService), reuse it; otherwise own one.
        var ownedTx = db.Database.CurrentTransaction == null
            ? await db.Database.BeginTransactionAsync()
            : null;

        try
        {
            var product = await db.Products
                .FirstOrDefaultAsync(p => p.Id == productId)
                ?? throw new KeyNotFoundException("Product not found.");

            var stockAfter = product.CurrentStock + quantityChanged;
            if (stockAfter < 0)
                throw new InvalidOperationException($"Insufficient stock. Current: {product.CurrentStock}, Requested change: {quantityChanged}.");

            var adjustment = new StockAdjustment
            {
                ProductId = productId,
                AdjustmentType = type,
                StockBefore = product.CurrentStock,
                QuantityChanged = quantityChanged,
                StockAfter = stockAfter,
                Reason = reason,
                AdjustedBy = adjustedBy,
                AdjustedAt = DateTime.UtcNow,
                RelatedOrderId = relatedOrderId
            };

            product.CurrentStock = stockAfter;
            db.StockAdjustments.Add(adjustment);
            await db.SaveChangesAsync();

            // Low-stock notification for supplier when an order deducts below threshold
            if (type == AdjustmentType.OrderDeduct && stockAfter < 10 && stockAfter >= 0)
            {
                await notificationService.CreateAsync(product.SupplierId, "LowStock",
                    $"'{product.Name}' is running low on stock ({stockAfter} left).", product.Id);
            }

            if (ownedTx != null) await ownedTx.CommitAsync();
        }
        catch
        {
            if (ownedTx != null) await ownedTx.RollbackAsync();
            throw;
        }
        finally
        {
            if (ownedTx != null) await ownedTx.DisposeAsync();
        }
    }
}
