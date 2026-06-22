namespace Backend.Models;

public class AuditLog
{
    public int Id { get; set; }
    public string TableName { get; set; } = string.Empty;
    public int RecordId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public int ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public User? Changer { get; set; }
    public ICollection<AuditLogAction> Actions { get; set; } = [];
}

public class AuditLogAction
{
    public int Id { get; set; }
    public int AuditLogId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    public AuditLog AuditLog { get; set; } = null!;
}
