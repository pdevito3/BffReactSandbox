namespace BespokeBff.Endpoints;

using BFF;

public static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this WebApplication app)
    {
        var health = app.MapGroup("/health")
            .WithTags("Health");

        health.MapGet("/", GetHealthStatus.Handle);

        return health;
    }
}