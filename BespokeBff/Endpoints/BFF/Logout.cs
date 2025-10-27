namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Serilog;

public static class Logout
{
    public static IResult Handle(HttpContext context, string? returnUrl)
    {
        Log.Information("Logout: received returnUrl = {ReturnUrl}", returnUrl ?? "null");

        var finalRedirectUri = "/";

        if (!string.IsNullOrEmpty(returnUrl))
        {
            // Validate if returnUrl is from an allowed origin
            if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
            {
                var origin = $"{uri.Scheme}://{uri.Host}:{uri.Port}";
                Log.Information("Logout: Checking origin {Origin} against allowed origins", origin);

                if (Configuration.BffConfiguration.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                {
                    Log.Information("Logout: Cross-origin returnUrl detected, routing through callback");
                    // Route through callback endpoint for cross-origin redirects
                    finalRedirectUri = $"/bff/callback?returnUrl={Uri.EscapeDataString(returnUrl)}";
                }
                else
                {
                    Log.Warning("Logout: Origin {Origin} not in allowed origins", origin);
                    finalRedirectUri = "/";
                }
            }
            else if (returnUrl.StartsWith("/"))
            {
                Log.Information("Logout: Relative path returnUrl, using directly");
                // Relative URL is fine
                finalRedirectUri = returnUrl;
            }
        }

        Log.Information("Logout: Setting RedirectUri to {RedirectUri}", finalRedirectUri);

        var props = new AuthenticationProperties
        {
            RedirectUri = finalRedirectUri
        };

        return Results.SignOut(props, [
            CookieAuthenticationDefaults.AuthenticationScheme,
            OpenIdConnectDefaults.AuthenticationScheme
        ]);
    }
}