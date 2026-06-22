namespace Backend.Helpers;

public class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
{
    public int? UserId
    {
        get
        {
            var claim = httpContextAccessor.HttpContext?.User?.FindFirst("uid")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }

    public string? Role => httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value;

    public int RequireUserId() => UserId ?? throw new UnauthorizedAccessException("User not authenticated.");
}
