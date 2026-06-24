using Backend.Models;

namespace Backend.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Patch seed image URLs on existing products (safe to run every startup)
        var seedImages = new Dictionary<string, string>
        {
            ["Wireless Mouse"]   = "/uploads/seed-product-1.jpg",
            ["USB-C Cable"]      = "/uploads/seed-product-2.jpg",
            ["Basmati Rice 5kg"] = "/uploads/seed-product-3.jpg"
        };
        foreach (var (name, url) in seedImages)
        {
            var p = db.Products.FirstOrDefault(x => x.Name == name && x.ImageUrl == null);
            if (p != null) { p.ImageUrl = url; }
        }
        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesWithoutAuditAsync();

        if (db.Users.Any()) return;

        var now = DateTime.UtcNow;

        var admin = new User
        {
            Name = "Admin",
            Email = "admin@inventory.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = UserRole.Admin,
            CanLogin = true,
            CreatedAt = now
        };

        var supplier = new User
        {
            Name = "Seed Supplier",
            Email = "supplier@inventory.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Supplier@123"),
            Role = UserRole.Supplier,
            CanLogin = true,
            IsApproved = true,
            IsActive = true,
            ActiveFromDate = DateOnly.FromDateTime(now),
            PhoneNumber = "9876543210",
            Location = "Mumbai, India",
            CreatedAt = now
        };

        var customer = new User
        {
            Name = "Seed Customer",
            Email = "customer@inventory.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123"),
            Role = UserRole.Customer,
            CanLogin = true,
            CreatedAt = now
        };

        db.Users.AddRange(admin, supplier, customer);
        await db.SaveChangesWithoutAuditAsync();

        var electronics = new Category { Name = "Electronics", Description = "Electronic goods", CreatedAt = now, CreatedBy = admin.Id };
        var grocery = new Category { Name = "Grocery", Description = "Food and groceries", CreatedAt = now, CreatedBy = admin.Id };
        db.Categories.AddRange(electronics, grocery);
        await db.SaveChangesWithoutAuditAsync();

        var product1 = new Product
        {
            Name = "Wireless Mouse",
            Description = "Ergonomic wireless mouse",
            CostPrice = 350m,
            SellingPrice = 599m,
            Unit = "pcs",
            OpeningStock = 100,
            CurrentStock = 100,
            ImageUrl = "/uploads/seed-product-1.jpg",
            CategoryId = electronics.Id,
            SupplierId = supplier.Id,
            CreatedAt = now,
            CreatedBy = supplier.Id
        };

        var product2 = new Product
        {
            Name = "USB-C Cable",
            Description = "Fast charging USB-C cable 1m",
            CostPrice = 80m,
            SellingPrice = 199m,
            Unit = "pcs",
            OpeningStock = 200,
            CurrentStock = 200,
            ImageUrl = "/uploads/seed-product-2.jpg",
            CategoryId = electronics.Id,
            SupplierId = supplier.Id,
            CreatedAt = now,
            CreatedBy = supplier.Id
        };

        var product3 = new Product
        {
            Name = "Basmati Rice 5kg",
            Description = "Premium basmati rice",
            CostPrice = 320m,
            SellingPrice = 450m,
            Unit = "bag",
            OpeningStock = 50,
            CurrentStock = 50,
            ImageUrl = "/uploads/seed-product-3.jpg",
            CategoryId = grocery.Id,
            SupplierId = supplier.Id,
            CreatedAt = now,
            CreatedBy = supplier.Id
        };

        db.Products.AddRange(product1, product2, product3);
        await db.SaveChangesWithoutAuditAsync();
    }
}
