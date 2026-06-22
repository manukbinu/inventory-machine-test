namespace Backend.DTOs;

public record PlaceOrderRequest(List<OrderItemRequest> Items);

public record OrderItemRequest(int ProductId, int Quantity);

public record UpdateOrderStatusRequest(string Status);

public record FulfillmentResponse(int SupplierId, string SupplierName, string SupplierEmail, string Status);

public record UpdateFulfillmentStatusRequest(string Status);

public record OrderResponse(
    int Id,
    string Status,
    DateTime CreatedAt,
    string CustomerEmail,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerAddress,
    List<OrderItemResponse> Items,
    decimal Total,
    List<FulfillmentResponse> Fulfillments);

public record OrderItemResponse(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal PriceAtOrder,
    decimal Subtotal,
    int SupplierId,
    string SupplierName);

public record OrderListResponse(
    int Id,
    string Status,
    DateTime CreatedAt,
    string CustomerEmail,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerAddress,
    decimal Total,
    decimal? SupplierTotal);
