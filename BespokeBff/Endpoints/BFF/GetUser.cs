namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

public static class GetUser
{
    public static async Task<IResult> Handle(HttpContext context)
    {
        if (!context.User.Identity?.IsAuthenticated ?? false)
        {
            return Results.Unauthorized();
        }

        var authResult = await context.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        
        var claims = context.User.Claims.Select(c => new
        {
            Type = c.Type,
            Value = c.Value
        });

        var tokenInfo = new
        {
            AccessTokenExpiresAt = authResult?.Properties?.GetTokenValue("expires_at"),
            SessionExpiresAt = authResult?.Properties?.ExpiresUtc?.ToString("O"),
            SessionIssuedAt = authResult?.Properties?.IssuedUtc?.ToString("O")
        };

        var user = new
        {
            IsAuthenticated = context.User.Identity?.IsAuthenticated ?? false,
            Claims = claims,
            TokenInfo = tokenInfo
        };

        return Results.Ok(user);
    }
}