namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Serilog;

public static class Login
{
    private static readonly string[] AllowedOrigins =
    [
        "http://localhost:4667",
        "https://localhost:4667"
    ];

    public static IResult Handle(HttpContext context, string? returnUrl)
    {
        Log.Information("Login endpoint called with returnUrl: {ReturnUrl}", returnUrl);

        // Validate and sanitize the return URL
        var finalReturnUrl = ValidateReturnUrl(returnUrl);

        Log.Information("Login endpoint validated returnUrl as: {FinalReturnUrl}", finalReturnUrl);

        var props = new AuthenticationProperties
        {
            RedirectUri = finalReturnUrl
        };

        // Store returnUrl in Items so it survives the OIDC flow
        props.Items["returnUrl"] = finalReturnUrl;

        return Results.Challenge(props, [OpenIdConnectDefaults.AuthenticationScheme]);
    }

    private static string ValidateReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return "/";
        }

        // If it's a relative URL, allow it
        if (returnUrl.StartsWith('/'))
        {
            return returnUrl;
        }

        // If it's a full URL, validate it's from an allowed origin
        if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
        {
            var origin = $"{uri.Scheme}://{uri.Host}:{uri.Port}";
            if (AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            {
                return returnUrl;
            }
        }

        // Default to root if validation fails
        return "/";
    }
}