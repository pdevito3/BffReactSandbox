namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Serilog;

public static class AuthCallback
{
    private static readonly string[] AllowedOrigins =
    [
        "http://localhost:4667",
        "https://localhost:4667"
    ];

    public static async Task<IResult> Handle(HttpContext context)
    {
        // Get the returnUrl from the authentication properties
        var result = await context.AuthenticateAsync();
        
        if (result?.Properties?.Items.TryGetValue("returnUrl", out var returnUrl) == true)
        {
            Log.Information("AuthCallback: returnUrl from auth properties = {ReturnUrl}", returnUrl);

            if (!string.IsNullOrEmpty(returnUrl) && 
                Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
            {
                var origin = $"{uri.Scheme}://{uri.Host}:{uri.Port}";
                
                if (AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                {
                    Log.Information("AuthCallback: Redirecting to {ReturnUrl}", returnUrl);
                    return Results.Redirect(returnUrl);
                }
            }
        }

        Log.Information("AuthCallback: No valid returnUrl, redirecting to /");
        return Results.Redirect("/");
    }
}
