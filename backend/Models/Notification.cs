namespace Backend.Models;

public class Notification : BaseEntity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public int? RelatedEntityId { get; set; }

    public User User { get; set; } = null!;
}
