using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .Build();

        var connStr = config.GetConnectionString("DefaultConnection")!;
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(connStr, new MySqlServerVersion(new Version(8, 0, 0)));

        // Provide a no-op IHttpContextAccessor for design time
        var httpContextAccessor = new HttpContextAccessor();
        return new AppDbContext(optionsBuilder.Options, httpContextAccessor);
    }
}
