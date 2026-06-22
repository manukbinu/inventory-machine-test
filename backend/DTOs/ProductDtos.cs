namespace Backend.DTOs;

public record CreateProductRequest(
    string Name,
    string? Description,
    decimal CostPrice,
    decimal SellingPrice,
    string Unit,
    int OpeningStock,
    int CategoryId);

public record UpdateProductRequest(
    string Name,
    string? Description,
    decimal CostPrice,
    decimal SellingPrice,
    string Unit,
    int CategoryId);

public record ProductResponse(
    int Id,
    string Name,
    string? Description,
    decimal CostPrice,
    decimal SellingPrice,
    string Unit,
    int OpeningStock,
    int CurrentStock,
    string? ImageUrl,
    int CategoryId,
    string CategoryName,
    int SupplierId,
    string SupplierEmail,
    DateTime CreatedAt);

public record ProductListResponse(
    int Id,
    string Name,
    decimal SellingPrice,
    string Unit,
    int CurrentStock,
    string? ImageUrl,
    string CategoryName,
    string SupplierEmail);

public record StockAdjustmentRequest(int QuantityChanged, string? Reason);

public record StockAdjustmentResponse(
    int Id,
    string AdjustmentType,
    int StockBefore,
    int QuantityChanged,
    int StockAfter,
    string? Reason,
    DateTime AdjustedAt,
    string AdjustedByEmail);

public record ProductFilterRequest
{
    public int? CategoryId { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public int? SupplierId { get; init; }
    public bool? InStock { get; init; }
    public string? Search { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record PagedResult<T>(IList<T> Items, int Total, int Page, int PageSize);
