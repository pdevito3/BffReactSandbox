namespace BespokeBff.Endpoints.BFF;

public static class GetAuthStatus
{
    public static IResult Handle(HttpContext context)
    {
        return Results.Ok(new
        {
            IsAuthenticated = context.User.Identity?.IsAuthenticated ?? false,
            Name = context.User.Identity?.Name
        });
    }
}