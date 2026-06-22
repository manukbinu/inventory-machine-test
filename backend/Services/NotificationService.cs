using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public class NotificationService(AppDbContext db)
{
    public async Task CreateAsync(int userId, string type, string message, int? relatedEntityId = null)
    {
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Message = message,
            IsRead = false,
            RelatedEntityId = relatedEntityId
        });
        await db.SaveChangesAsync();
    }
}
