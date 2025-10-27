
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
        var fusionAuthConfig = builder.Configuration.GetSection("FusionAuth");
        
        options.Authority = fusionAuthConfig["Authority"];
        options.ClientId = fusionAuthConfig["ClientId"];
        options.ClientSecret = fusionAuthConfig["ClientSecret"];
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
            OnTicketReceived = (context) =>
            {
                // Read returnUrl from Items (stored by Login endpoint)
                context.Properties.Items.TryGetValue("returnUrl", out var returnUrl);

                Log.Information("OnTicketReceived: returnUrl from items = {ReturnUrl}", returnUrl ?? "null");

                if (string.IsNullOrEmpty(returnUrl))
                {
                    // No returnUrl stored, use default redirect
                    return Task.CompletedTask;
                }

                // If it's a full URL from an allowed origin, redirect to callback endpoint
                if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
                {
                    var origin = $"{uri.Scheme}://{uri.Host}:{uri.Port}";
                    Log.Information("OnTicketReceived: Checking origin {Origin} against allowed origins", origin);

                    if (BespokeBff.Configuration.BffConfiguration.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                    {
                        Log.Information("OnTicketReceived: Redirecting to /bff/callback to handle external URL");
                        // Pass the returnUrl as a query parameter so it persists to the callback
                        context.Properties.RedirectUri = $"/bff/callback?returnUrl={Uri.EscapeDataString(returnUrl)}";
                    }
                    else
                    {
                        Log.Warning("OnTicketReceived: Origin {Origin} not in allowed origins", origin);
                        // For disallowed origins, just redirect to root
                        context.Properties.RedirectUri = "/";
                    }
                }
                else if (returnUrl.StartsWith("/"))
                {
                    Log.Information("OnTicketReceived: Setting RedirectUri to relative URL {ReturnUrl}", returnUrl);
                    context.Properties.RedirectUri = returnUrl;
                }
                else
                {
                    Log.Information("OnTicketReceived: No valid returnUrl, redirecting to /");
                    context.Properties.RedirectUri = "/";
                }

                return Task.CompletedTask;
            },
            OnRemoteFailure = (context) =>
            {
                if (context.Failure is AuthenticationFailureException)
                {
                    context.Response.Redirect("/bff/login");
                    context.HandleResponse();
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
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                         ?? new[] { "http://localhost:4667", "https://localhost:4667" };

    // Initialize BFF configuration for use in endpoints and events
    BespokeBff.Configuration.BffConfiguration.AllowedOrigins = allowedOrigins;

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(allowedOrigins)
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