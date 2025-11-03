using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;
using Duende.AccessTokenManagement.OpenIdConnect;
using Duende.AccessTokenManagement;
using Microsoft.Extensions.DependencyInjection;

namespace BespokeBff.Middleware;

public class AuthHeaderTransform : ITransformProvider
{
    public void ValidateRoute(TransformRouteValidationContext context)
    {
        // No validation needed
    }

    public void ValidateCluster(TransformClusterValidationContext context)
    {
        // No validation needed
    }

    public void Apply(TransformBuilderContext context)
    {
        // Apply auth header transform to all routes
        context.AddRequestTransform(async transformContext =>
        {
            var httpContext = transformContext.HttpContext;
            var logger = httpContext.RequestServices.GetRequiredService<ILogger<AuthHeaderTransform>>();

            logger.LogInformation("AuthHeaderTransform: Processing request to {Path}", httpContext.Request.Path);
            logger.LogInformation("AuthHeaderTransform: User authenticated = {IsAuthenticated}", httpContext.User.Identity?.IsAuthenticated);

            if (httpContext.User.Identity?.IsAuthenticated == true)
            {
                try
                {
                    // Get tokens from the authentication session
                    // We use tokens directly from the cookie to avoid triggering response modifications
                    // during the YARP transform (which would abort the proxy)
                    var authenticateResult = await httpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                    var accessToken = authenticateResult?.Properties?.GetTokenValue("access_token");
                    var expiresAtString = authenticateResult?.Properties?.GetTokenValue("expires_at");

                    logger.LogInformation("AuthHeaderTransform: Access token present = {HasAccessToken}, Expires at = {ExpiresAt}",
                        !string.IsNullOrEmpty(accessToken), expiresAtString ?? "unknown");

                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        // Check if token is expired or close to expiring
                        if (DateTimeOffset.TryParse(expiresAtString, out var expiresAt))
                        {
                            var timeUntilExpiry = expiresAt - DateTimeOffset.UtcNow;
                            logger.LogInformation("AuthHeaderTransform: Token expires in {Minutes} minutes", timeUntilExpiry.TotalMinutes);

                            if (timeUntilExpiry.TotalMinutes < 5)
                            {
                                logger.LogWarning("AuthHeaderTransform: Token is expired or about to expire. Client should call /bff/refresh");
                            }
                        }

                        // Add the Bearer token to the proxied request
                        transformContext.ProxyRequest.Headers.Authorization =
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                        logger.LogInformation("AuthHeaderTransform: Added Bearer token to proxied request");
                    }
                    else
                    {
                        logger.LogWarning("AuthHeaderTransform: No access token in session");
                    }

                    // Note: Token refresh should be handled proactively by the client calling /bff/refresh
                    // or by middleware that runs before the YARP transform. We don't refresh here because
                    // any response modifications (like updating the cookie) will abort the proxy.
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the request
                    logger.LogError(ex, "AuthHeaderTransform: Exception while adding auth header to proxied request");
                }
            }
            else
            {
                logger.LogInformation("AuthHeaderTransform: User not authenticated, skipping token attachment");
            }
        });
    }
}