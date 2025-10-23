
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Security.Claims;
using BespokeBff.Middleware;
using BespokeBff.Endpoints;

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

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
    {
        options.Cookie.Name = "__Host-MyAppBFF";
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.HttpOnly = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(1);
        options.SlidingExpiration = true;
        
        // automatically revoke refresh token at signout time (if supported)
        options.Events.OnSigningOut = async e =>
        {
            try
            {
                await e.HttpContext.RevokeRefreshTokenAsync();
            }
            catch (InvalidOperationException)
            {
                Log.Debug("Refresh token revocation not supported by identity provider");
            }
        };
        
    })
    .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
    {
        var authgearConfig = builder.Configuration.GetSection("Authgear");

        options.Authority = authgearConfig["Authority"];
        options.ClientId = authgearConfig["ClientId"];
        options.ClientSecret = authgearConfig["ClientSecret"];
        options.ResponseType = "code";
        
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("email");
        options.Scope.Add("profile");
        options.Scope.Add("offline_access"); // Required for refresh tokens
        
        options.CallbackPath = "/signin-oidc";
        options.SignedOutCallbackPath = "/signout-callback-oidc";
        options.RemoteSignOutPath = "/signout-oidc";
        
        options.Events = new OpenIdConnectEvents
        {
            OnRemoteFailure = (context) =>
            {
                if (context.Failure is AuthenticationFailureException)
                {
                    context.Response.Redirect("/bff/login");
                    context.HandleResponse();
                }

                return Task.CompletedTask;
            },
            OnTicketReceived = (context) =>
            {
                // After successful authentication, retrieve the returnUrl from Items
                context.Properties.Items.TryGetValue("returnUrl", out var returnUrl);

                Log.Information("OnTicketReceived: returnUrl from Items = {ReturnUrl}", returnUrl);

                if (string.IsNullOrEmpty(returnUrl))
                    return Task.CompletedTask;

                // Instead of trying to set an external URL directly (which OIDC middleware ignores),
                // redirect to our callback endpoint which will handle the external redirect
                // after the cookie is already signed in
                if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var _))
                {
                    Log.Information("OnTicketReceived: Redirecting to /bff/callback to handle external URL");
                    context.Properties.RedirectUri = "/bff/callback";
                }
                else if (returnUrl.StartsWith('/'))
                {
                    // For relative URLs, we can set them directly
                    Log.Information("OnTicketReceived: Setting RedirectUri to relative URL {ReturnUrl}", returnUrl);
                    context.Properties.RedirectUri = returnUrl;
                }

                return Task.CompletedTask;
            }
        };
        
        options.GetClaimsFromUserInfoEndpoint = true;
        
        // important! this store the access and refresh token in the authentication session
        // this is needed to the standard token store to manage the artifacts
        options.SaveTokens = true;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment(); 
        options.UsePkce = true;
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = "email",
            RoleClaimType = ClaimTypes.Role
        };
    });

    builder.Services.AddAuthorization();

    // For Duende Access Token Management
    builder.Services.AddMemoryCache();
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
    {
        options.RefreshBeforeExpiration = TimeSpan.FromMinutes(5);
        options.UseChallengeSchemeScopedTokens = true;
    });

    // Add CSRF protection
    builder.Services.AddCsrfProtection(options =>
    {
        options.HeaderName = "X-CSRF";
        options.RequiredHeaderValue = "1";
        // Additional paths can be excluded if needed
        // options.ExcludedPaths.Add("/custom-endpoint");
    });

    // Add YARP with auth header transform
    builder.Services.AddReverseProxy()
        .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
        .AddTransforms<AuthHeaderTransform>();

    // Add CORS
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins("http://localhost:4667", "https://localhost:4667")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();
    app.UseSerilogRequestLogging();
    
    app.UseCors();
    
    app.UseAuthentication();
    app.UseAuthorization();
    
    app.UseCsrfProtection();

    // Map YARP routes (must be before other endpoints)
    app.MapReverseProxy();

    // Map endpoint groups
    app.MapBffEndpoints();
    app.MapHealthEndpoints();

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