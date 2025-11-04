using Duende.Bff.Yarp;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting BFF");

    var builder = WebApplication.CreateBuilder(args);
    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddControllers();

    builder.Services.AddBff()
        .AddRemoteApis();

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = "cookie";
        options.DefaultChallengeScheme = "oidc";
        options.DefaultSignOutScheme = "oidc";
    })
    .AddCookie("cookie", options =>
    {
        // options.Cookie.Name = "__Host-BespokeBFF";
        // options.Cookie.SameSite = SameSiteMode.Strict;
        // options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        // options.Cookie.HttpOnly = true;
        // options.ExpireTimeSpan = TimeSpan.FromHours(1);
        // options.SlidingExpiration = true;
        
        options.Cookie.Name = "BespokeBFF";
        options.Cookie.SameSite = SameSiteMode.Lax; // Changed from Strict to Lax for cross-origin redirects
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // Allows HTTP in dev, HTTPS in prod
        options.Cookie.HttpOnly = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
    })
    .AddOpenIdConnect("oidc", options =>
    {
        var keycloakConfig = builder.Configuration.GetSection("Keycloak");

        options.Authority = keycloakConfig["Authority"];
        options.ClientId = keycloakConfig["ClientId"];
        options.ClientSecret = keycloakConfig["ClientSecret"];
        options.ResponseType = "code";
        options.ResponseMode = "query";
        options.UsePkce = true;

        options.GetClaimsFromUserInfoEndpoint = true;
        options.MapInboundClaims = false;
        options.SaveTokens = true;

        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("email");
        options.Scope.Add("profile");
        options.Scope.Add("offline_access"); // Required for refresh tokens
        options.Scope.Add("bespoke_bff_api"); // Required for backend API calls

        options.TokenValidationParameters = new()
        {
            NameClaimType = "email",
            RoleClaimType = "role"
        };
        
        options.Events = new OpenIdConnectEvents
        {
            OnRemoteFailure = (context) =>
            {
                // https://github.com/dotnet/aspnetcore/issues/45620
                if (context.Failure?.Message == "Correlation failed.")
                {
                    context.Response.Redirect("/bff/login");
                    context.HandleResponse();
                }

                return Task.CompletedTask;
            },
        };
    });

    // builder.Services.AddAuthorization();

    const string cors = "BespokeBffCorsPolicy";
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(cors, policy =>
            policy.SetIsOriginAllowed(_ => true)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials()
                .WithExposedHeaders("X-Pagination"));
    });
    
    var app = builder.Build();

    app.UseCors(cors);
    // adds route matching to the middleware pipeline. This middleware looks at the set of endpoints defined in the app, and selects the best match based on the request.
    app.UseRouting();

    app.UseAuthentication();
    app.UseBff();
    app.UseAuthorization();

    // BFF management endpoints (login, logout, user, etc.)
    app.MapBffManagementEndpoints();

    // Map controllers as BFF API endpoints
    app.MapControllers()
        .RequireAuthorization()
        .AsBffApiEndpoint();

    // Map remote API endpoint with access token forwarding
    app.MapRemoteBffApiEndpoint("/api", "http://localhost:5160/api")
        .RequireAccessToken();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "BFF terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}