using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Configure JWT authentication with Keycloak
var keycloakConfig = builder.Configuration.GetSection("Keycloak");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = keycloakConfig["Authority"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.Audience = keycloakConfig["ValidAudience"];

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidAudience = keycloakConfig["ValidAudience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

// Add authorization
builder.Services.AddAuthorization(options =>
{
});

// Add CORS to allow BFF to proxy requests
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:3118", "https://localhost:3118" };
const string cors = "BespokeBffApiCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(cors, builder => 
        builder.SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("X-Pagination"));
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(cors);
app.UseAuthentication();
app.UseAuthorization();

// Public endpoint - no authentication required
app.MapPost("/api/public", (PublicRequest request) =>
{
    return Results.Ok(new PublicResponse
    {
        Message = $"Hello {request.Name}! This is a public endpoint.",
        Timestamp = DateTime.UtcNow.ToString("o")
    });
})
.WithName("PublicEndpoint")
.AllowAnonymous();

// Debug endpoint - JWT validation only (no client_id policy)
app.MapGet("/api/debug-claims", (HttpContext context) =>
{
    var user = context.User;

    return Results.Ok(new
    {
        Message = "Debug: All JWT claims",
        IsAuthenticated = user.Identity?.IsAuthenticated ?? false,
        AuthenticationType = user.Identity?.AuthenticationType,
        AllClaims = user.Claims.Select(c => new { c.Type, c.Value }).ToList()
    });
})
.WithName("DebugClaims")
.RequireAuthorization(); // Only requires JWT validation, no client_id policy

// Secure endpoint - requires JWT validation with proper audience
app.MapPost("/api/secure", (SecureRequest request, HttpContext context) =>
{
    var user = context.User;
    var userId = user.FindFirst("sub")?.Value ?? "unknown";
    var email = user.FindFirst("email")?.Value ?? "unknown";

    // Extract key claims for debugging
    var audience = user.FindFirst("aud")?.Value;
    var clientId = user.FindFirst("azp")?.Value ?? user.FindFirst("client_id")?.Value; // Keycloak uses azp (authorized party)
    var issuer = user.FindFirst("iss")?.Value;

    return Results.Ok(new SecureResponse
    {
        Message = $"✅ Hello {request.Name}! Full JWT validation passed (iss, aud, lifetime)",
        Data = request.Data,
        Timestamp = DateTime.UtcNow.ToString("o"),
        UserId = userId,
        Email = email,
        Issuer = issuer,
        Audience = audience,
        ClientId = clientId,
        Claims = user.Claims.Select(c => new { c.Type, c.Value }).ToList()
    });
})
.WithName("SecureEndpoint")
.RequireAuthorization(); // Enforces JWT validation with audience, issuer, and lifetime checks

app.Run();

// Request/Response models
record PublicRequest(string Name);
record PublicResponse
{
    public required string Message { get; init; }
    public required string Timestamp { get; init; }
}

record SecureRequest(string Name, string Data);
record SecureResponse
{
    public required string Message { get; init; }
    public string? Data { get; init; }
    public required string Timestamp { get; init; }
    public string? UserId { get; init; }
    public string? Email { get; init; }
    public string? Issuer { get; init; }
    public string? Audience { get; init; }
    public string? ClientId { get; init; }
    public object? Claims { get; init; }
}