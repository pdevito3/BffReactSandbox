namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;

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
            HasAccessToken = !string.IsNullOrEmpty(authResult?.Properties?.GetTokenValue("access_token")),
            HasRefreshToken = !string.IsNullOrEmpty(authResult?.Properties?.GetTokenValue("refresh_token")),
            AccessTokenExpiresAt = authResult?.Properties?.GetTokenValue("expires_at"),
            SessionExpiresAt = authResult?.Properties?.ExpiresUtc?.ToString("O"),
            SessionIssuedAt = authResult?.Properties?.IssuedUtc?.ToString("O")
        };

        // Extract user properties from claims
        var name = GetUserName(context.User);
        var email = GetUserEmail(context.User);
        var initials = GetUserInitials(name);

        var user = new
        {
            IsAuthenticated = context.User.Identity?.IsAuthenticated ?? false,
            Name = name,
            Email = email,
            Initials = initials,
            TokenInfo = tokenInfo,
            Claims = claims
        };

        return Results.Ok(user);
    }

    private static string? GetUserName(ClaimsPrincipal user)
    {
        // Try standard SOAP claim format for givenname and surname
        var firstName = GetClaimValue(user, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname");
        var lastName = GetClaimValue(user, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname");

        if (!string.IsNullOrEmpty(firstName) || !string.IsNullOrEmpty(lastName))
        {
            return string.Join(" ", new[] { firstName, lastName }.Where(s => !string.IsNullOrEmpty(s)));
        }

        // Fallback to other common name claims
        return GetClaimValue(user, "name")
            ?? GetClaimValue(user, "given_name")
            ?? GetClaimValue(user, "family_name")
            ?? GetClaimValue(user, "preferred_username")
            ?? GetClaimValue(user, "nickname");
    }

    private static string? GetUserEmail(ClaimsPrincipal user)
    {
        return GetClaimValue(user, "email")
            ?? GetClaimValue(user, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")
            ?? GetClaimValue(user, "email_verified");
    }

    private static string? GetUserInitials(string? name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return null;
        }

        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length == 0)
        {
            return null;
        }

        if (parts.Length == 1)
        {
            return parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpper();
        }

        return string.Concat(parts[0][0], parts[^1][0]).ToUpper();
    }

    private static string? GetClaimValue(ClaimsPrincipal user, string claimType)
    {
        return user.Claims.FirstOrDefault(c => c.Type == claimType)?.Value;
    }
}