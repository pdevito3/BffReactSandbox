namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Serilog;

public static class AuthCallback
{
    public static IResult Handle(HttpContext context)
    {
        // Get the returnUrl from the query parameter
        var returnUrl = context.Request.Query["returnUrl"].ToString();

        Log.Information("AuthCallback: returnUrl from query = {ReturnUrl}", returnUrl);

        if (!string.IsNullOrEmpty(returnUrl))
        {
            // Validate if returnUrl is from an allowed origin
            if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
            {
                var origin = $"{uri.Scheme}://{uri.Host}:{uri.Port}";

                if (Configuration.BffConfiguration.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                {
                    Log.Information("AuthCallback: Redirecting to {ReturnUrl}", returnUrl);
                    return Results.Redirect(returnUrl);
                }

                Log.Warning("AuthCallback: Origin {Origin} not in allowed origins", origin);
            }

            // For relative URLs, redirect directly
            if (returnUrl.StartsWith("/"))
            {
                Log.Information("AuthCallback: Redirecting to relative URL {ReturnUrl}", returnUrl);
                return Results.Redirect(returnUrl);
            }
        }

        Log.Information("AuthCallback: No valid returnUrl, redirecting to /");
        return Results.Redirect("/");
    }
}
