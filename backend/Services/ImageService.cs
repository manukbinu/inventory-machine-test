namespace Backend.Services;

public class ImageService(IWebHostEnvironment env)
{
    private const long MaxBytes = 5 * 1024 * 1024;
    private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];

    public async Task<string> SaveAsync(IFormFile file)
    {
        if (file.Length > MaxBytes)
            throw new InvalidOperationException("Image must be under 5 MB.");

        if (!AllowedTypes.Contains(file.ContentType))
            throw new InvalidOperationException("Only JPEG, PNG, and WebP images are allowed.");

        var uploadsDir = Path.Combine(env.WebRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream);

        return $"/uploads/{fileName}";
    }

    public void Delete(string? imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return;
        var path = Path.Combine(env.WebRootPath, imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(path)) File.Delete(path);
    }
}
