using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Configure JWT authentication
var fusionAuthConfig = builder.Configuration.GetSection("FusionAuth");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = fusionAuthConfig["Authority"];
        options.Audience = fusionAuthConfig["Audience"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidAudience = fusionAuthConfig["Audience"],
            ValidIssuer = fusionAuthConfig["Authority"]
        };
    });

builder.Services.AddAuthorization();

// Add CORS to allow BFF to proxy requests
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
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

// Secure endpoint - authentication required
app.MapPost("/api/secure", (SecureRequest request) =>
{
    return Results.Ok(new SecureResponse
    {
        Message = $"Hello {request.Name}! This is a secure endpoint.",
        Data = request.Data,
        Timestamp = DateTime.UtcNow.ToString("o")
    });
})
.WithName("SecureEndpoint")
.RequireAuthorization();

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
}