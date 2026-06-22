namespace Backend.DTOs;

public record DashboardResponse(
    // KPIs
    int TotalOrdersToday,
    int TotalOrdersMonth,
    decimal RevenueToday,
    decimal RevenueMonth,
    int LowStockCount,
    int OutOfStockCount,
    int TotalCustomers,
    int TotalSuppliers,
    int PendingOrdersCount,
    decimal AverageOrderValue,
    // Charts
    List<LowStockProduct> LowStockProducts,
    List<OutOfStockProduct> OutOfStockProducts,
    List<OrdersPerDay> OrdersPerDay,
    List<RevenuePerDay> RevenuePerDay,
    List<RevenuePerSupplier> RevenuePerSupplier,
    List<OrdersByStatus> OrdersByStatus,
    List<CategoryProductCount> CategoryProductCounts,
    List<TopSellingProduct> TopSellingProducts,
    List<SupplierOrderCount> SupplierOrderCounts,
    List<RecentOrder> RecentOrders);

public record LowStockProduct(int Id, string Name, int CurrentStock, string SupplierEmail);
public record OutOfStockProduct(int Id, string Name, string SupplierEmail);
public record OrdersPerDay(DateOnly Date, int Count);
public record RevenuePerDay(DateOnly Date, decimal Revenue);
public record RevenuePerSupplier(string SupplierEmail, string SupplierName, decimal Revenue);
public record OrdersByStatus(string Status, int Count);
public record CategoryProductCount(string CategoryName, int ProductCount);
public record TopSellingProduct(int Id, string Name, int TotalSold, decimal Revenue);
public record SupplierOrderCount(string SupplierName, string SupplierEmail, int OrderCount, decimal Revenue);
public record RecentOrder(int Id, string CustomerName, string Status, DateTime CreatedAt, decimal Total);

public record AuditLogResponse(
    int Id,
    string TableName,
    int RecordId,
    string ActionType,
    string ChangedByEmail,
    DateTime ChangedAt,
    string? IpAddress);

public record AuditLogDetailResponse(
    int Id,
    string TableName,
    int RecordId,
    string ActionType,
    string ChangedByEmail,
    DateTime ChangedAt,
    string? IpAddress,
    List<AuditLogActionResponse> Actions);

public record AuditLogActionResponse(string FieldName, string? OldValue, string? NewValue);
