using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Configure JWT authentication with FusionAuth
var fusionAuthConfig = builder.Configuration.GetSection("FusionAuth");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = fusionAuthConfig["Authority"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.TokenValidationParameters = new TokenValidationParameters
        {
            // FusionAuth free tier limitation workaround:
            // Custom audience is a paid feature, so we validate against the BFF Application ID
            ValidateIssuer = true,
            ValidIssuer = fusionAuthConfig["ValidIssuer"],

            ValidateAudience = true,
            ValidAudience = fusionAuthConfig["ValidAudience"], // BFF Application ID

            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

// Add authorization with applicationId policy for API-specific access control
// This is the key part of the workaround - ensures only the BFF can access this API
// NOTE: FusionAuth uses "applicationId" claim instead of "client_id"
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("BffClientOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("applicationId", fusionAuthConfig["ExpectedClientId"]!);
    });
});

// Add CORS to allow BFF to proxy requests
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:3118", "https://localhost:3118" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
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

// Secure endpoint - requires JWT validation + applicationId check
app.MapPost("/api/secure", (SecureRequest request, HttpContext context) =>
{
    var user = context.User;
    var userId = user.FindFirst("sub")?.Value ?? "unknown";
    var email = user.FindFirst("email")?.Value ?? "unknown";

    // Extract key claims for debugging
    var audience = user.FindFirst("aud")?.Value;
    var applicationId = user.FindFirst("applicationId")?.Value; // FusionAuth uses applicationId
    var issuer = user.FindFirst("iss")?.Value;

    return Results.Ok(new SecureResponse
    {
        Message = $"✅ Hello {request.Name}! Full JWT validation passed (iss, aud, lifetime, applicationId)",
        Data = request.Data,
        Timestamp = DateTime.UtcNow.ToString("o"),
        UserId = userId,
        Email = email,
        Issuer = issuer,
        Audience = audience,
        ClientId = applicationId, // Return as ClientId for compatibility
        Claims = user.Claims.Select(c => new { c.Type, c.Value }).ToList()
    });
})
.WithName("SecureEndpoint")
.RequireAuthorization("BffClientOnly"); // Enforces both JWT validation AND applicationId check

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