namespace BespokeBff.Endpoints.BFF;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

public static class Logout
{
    public static IResult Handle(HttpContext context, string? returnUrl)
    {
        var props = new AuthenticationProperties
        {
            RedirectUri = returnUrl ?? "/"
        };
        return Results.SignOut(props, [
            CookieAuthenticationDefaults.AuthenticationScheme,
            OpenIdConnectDefaults.AuthenticationScheme
        ]);
    }
}