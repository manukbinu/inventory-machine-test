using System.Text;
using System.Threading.RateLimiting;
using Backend.Data;
using Backend.Helpers;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Database
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, new MySqlServerVersion(new Version(8, 0, 0))));

// HTTP context for audit
builder.Services.AddHttpContextAccessor();

// Auth
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        // .NET 8+ uses JsonWebTokenHandler which ignores JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.
        // MapInboundClaims = false keeps claim names exactly as they appear in the token.
        opt.MapInboundClaims = false;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            RoleClaimType = "role",
            NameClaimType = "uid"
        };
    });

builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly", p => p.RequireClaim("role", "Admin"));
    opt.AddPolicy("SupplierOnly", p => p.RequireClaim("role", "Supplier"));
    opt.AddPolicy("CustomerOnly", p => p.RequireClaim("role", "Customer"));
    opt.AddPolicy("AdminOrSupplier", p => p.RequireClaim("role", "Admin", "Supplier"));
});

// Rate limiting (built-in, no package needed)
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;

    // Auth endpoints — strict: 10 requests per minute per IP (brute-force protection)
    opt.AddFixedWindowLimiter("auth", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 10;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });

    // General API — 60 requests per minute per IP
    opt.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 60;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
});

// In-memory cache (built-in, no package needed)
builder.Services.AddMemoryCache();

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<StockService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<ImageService>();
builder.Services.AddScoped<CurrentUserAccessor>();

builder.Services.AddControllers().AddJsonOptions(opts =>
    opts.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter()));
builder.Services.AddOpenApi();

// CORS for Angular dev
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:4200")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

// Migrate & seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseCors();
app.UseRateLimiter();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
