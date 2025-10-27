namespace BespokeBff.Endpoints;

using BFF;

public static class BffEndpoints
{
    public static RouteGroupBuilder MapBffEndpoints(this WebApplication app)
    {
        var bff = app.MapGroup("/bff")
            .WithTags("Bff");

        bff.MapGet("/login", Login.Handle);
        bff.MapGet("/logout", Logout.Handle);
        bff.MapGet("/callback", (Delegate)AuthCallback.Handle);
        bff.MapGet("/user", (Delegate)GetUser.Handle).RequireAuthorization();
        bff.MapPost("/refresh", (Delegate)RefreshToken.Handle).RequireAuthorization();
        bff.MapGet("/status", GetAuthStatus.Handle);

        return bff;
    }
}