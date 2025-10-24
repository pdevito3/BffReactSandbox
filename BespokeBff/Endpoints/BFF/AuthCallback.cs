namespace BespokeBff.Endpoints.BFF;

using BespokeBff.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Serilog;

public static class AuthCallback
{
    public static async Task<IResult> Handle(
        HttpContext context,
        IOptions<BffOptions> bffOptions)
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

                if (bffOptions.Value.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
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
