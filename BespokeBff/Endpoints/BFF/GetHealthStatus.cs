namespace BespokeBff.Endpoints.BFF;

public static class GetHealthStatus
{
    public static IResult Handle()
    {
        return Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
    }
}