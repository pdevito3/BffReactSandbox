namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

public static class Login
{
    public static IResult Handle(HttpContext context, string? returnUrl)
    {
        var props = new AuthenticationProperties
        {
            RedirectUri = returnUrl ?? "/"
        };

        // Store returnUrl in Items so we can access it in OnTicketReceived
        if (!string.IsNullOrEmpty(returnUrl))
        {
            props.Items["returnUrl"] = returnUrl;
        }

        return Results.Challenge(props, [OpenIdConnectDefaults.AuthenticationScheme]);
    }
}