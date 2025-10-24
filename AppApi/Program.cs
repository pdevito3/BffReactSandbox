using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Configure JWT Bearer Authentication
var authgearConfig = builder.Configuration.GetSection("Authgear");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authgearConfig["Authority"];
        options.Audience = authgearConfig["Audience"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authgearConfig["ValidIssuer"],
            ValidateAudience = false, // Authgear doesn't set custom audience by default
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3118", "https://localhost:3118")
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

// Disable HTTPS redirection for development when being proxied by BFF
// app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Anonymous endpoint - no authentication required
app.MapGet("/health", () => new
    {
        Status = "Healthy",
        Timestamp = DateTime.UtcNow,
        Message = "AppApi is running - this endpoint allows anonymous access"
    })
    .WithName("Health")
    .AllowAnonymous();

// Protected endpoint - requires authentication
app.MapGet("/data", [Authorize] (HttpContext context) =>
    {
        var user = context.User;
        var userId = user.FindFirst("sub")?.Value ?? "unknown";
        var email = user.FindFirst("email")?.Value ?? "unknown";

        // Check for audience claim
        var audience = user.FindFirst("aud")?.Value;
        var clientId = user.FindFirst("client_id")?.Value;

        return new
        {
            Message = "This is protected data from the API",
            UserId = userId,
            Email = email,
            Audience = audience,
            ClientId = clientId,
            Timestamp = DateTime.UtcNow,
            Claims = user.Claims.Select(c => new { c.Type, c.Value }).ToList()
        };
    })
    .WithName("GetProtectedData")
    .RequireAuthorization();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
    {
        var forecast = Enumerable.Range(1, 5).Select(index =>
                new WeatherForecast
                (
                    DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    Random.Shared.Next(-20, 55),
                    summaries[Random.Shared.Next(summaries.Length)]
                ))
            .ToArray();
        return forecast;
    })
    .WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}