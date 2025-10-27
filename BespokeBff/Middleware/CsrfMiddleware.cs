namespace BespokeBff.Middleware;

/// <summary>
/// CSRF protection middleware that validates the presence of X-CSRF header
/// for authenticated requests to local API endpoints.
/// Similar to Duende.BFF's anti-forgery protection mechanism.
/// </summary>
public class CsrfMiddleware(RequestDelegate next, ILogger<CsrfMiddleware> logger, CsrfOptions options)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Only validate CSRF for requests that require protection
        if (ShouldValidateCsrf(context))
        {
            if (!IsValidCsrfRequest(context))
            {
                logger.LogWarning("CSRF validation failed for {Method} {Path} from {RemoteIpAddress}", 
                    context.Request.Method, 
                    context.Request.Path, 
                    context.Connection.RemoteIpAddress);
                
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing or invalid anti-forgery token.");
                return;
            }
        }

        await next(context);
    }

    private bool ShouldValidateCsrf(HttpContext context)
    {
        var request = context.Request;
        
        // Only validate for authenticated users
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            return false;
        }

        // Only validate for state-changing HTTP methods
        if (!IsStatefulHttpMethod(request.Method))
        {
            return false;
        }

        // Only validate for local API endpoints (not reverse proxy routes)
        if (IsReverseProxyRoute(context))
        {
            return false;
        }

        // Skip validation for excluded paths
        if (IsExcludedPath(request.Path))
        {
            return false;
        }

        return true;
    }

    private bool IsValidCsrfRequest(HttpContext context)
    {
        var request = context.Request;
        
        // Check for X-CSRF header
        if (request.Headers.TryGetValue(options.HeaderName, out var headerValues))
        {
            var headerValue = headerValues.FirstOrDefault();
            return !string.IsNullOrEmpty(headerValue) && 
                   (options.RequiredHeaderValue == null || headerValue == options.RequiredHeaderValue);
        }

        return false;
    }

    private static bool IsStatefulHttpMethod(string method)
    {
        return method.Equals("POST", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("PATCH", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("DELETE", StringComparison.OrdinalIgnoreCase);
    }

    private bool IsReverseProxyRoute(HttpContext context)
    {
        // Check if this request is handled by YARP reverse proxy
        // YARP sets specific features that we can check for
        return context.Features.Get<Yarp.ReverseProxy.Model.ReverseProxyFeature>() != null;
    }

    private bool IsExcludedPath(PathString path)
    {
        return options.ExcludedPaths.Any(excludedPath => 
            path.StartsWithSegments(excludedPath, StringComparison.OrdinalIgnoreCase));
    }
}

/// <summary>
/// Configuration options for CSRF protection middleware
/// </summary>
public class CsrfOptions
{
    /// <summary>
    /// Name of the header to check for CSRF protection (default: "X-CSRF")
    /// </summary>
    public string HeaderName { get; set; } = "X-CSRF";

    /// <summary>
    /// Required value for the CSRF header. If null, any non-empty value is accepted (default: "1")
    /// </summary>
    public string? RequiredHeaderValue { get; set; } = "1";

    /// <summary>
    /// Paths that should be excluded from CSRF validation
    /// </summary>
    public List<string> ExcludedPaths { get; set; } = new()
    {
        "/bff/login",
        "/bff/logout",
        "/bff/callback",
        "/signin-oidc",
        "/signout-callback-oidc",
        "/signout-oidc",
        "/health"
    };
}

/// <summary>
/// Extension methods for adding CSRF protection
/// </summary>
public static class CsrfExtensions
{
    /// <summary>
    /// Adds CSRF protection middleware with default options
    /// </summary>
    public static IServiceCollection AddCsrfProtection(this IServiceCollection services)
    {
        return services.AddCsrfProtection(new CsrfOptions());
    }

    /// <summary>
    /// Adds CSRF protection middleware with custom options
    /// </summary>
    public static IServiceCollection AddCsrfProtection(this IServiceCollection services, CsrfOptions options)
    {
        services.AddSingleton(options);
        return services;
    }

    /// <summary>
    /// Adds CSRF protection middleware with configuration action
    /// </summary>
    public static IServiceCollection AddCsrfProtection(this IServiceCollection services, Action<CsrfOptions> configureOptions)
    {
        var options = new CsrfOptions();
        configureOptions(options);
        return services.AddCsrfProtection(options);
    }

    /// <summary>
    /// Uses CSRF protection middleware in the request pipeline
    /// </summary>
    public static IApplicationBuilder UseCsrfProtection(this IApplicationBuilder app)
    {
        return app.UseMiddleware<CsrfMiddleware>();
    }
}