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
        bff.MapGet("/user", (Delegate)GetUser.Handle); // Handles auth manually to return 401 instead of 302
        bff.MapPost("/refresh", (Delegate)RefreshToken.Handle).RequireAuthorization();
        bff.MapGet("/status", GetAuthStatus.Handle);

        return bff;
    }
}