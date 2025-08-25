using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;
using Duende.AccessTokenManagement.OpenIdConnect;
using Duende.AccessTokenManagement;

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
            
            // Check if user is authenticated
            if (httpContext.User.Identity?.IsAuthenticated == true)
            {
                try
                {
                    // Use Duende Access Token Management to get access token with automatic refresh
                    var tokenResult = await httpContext.GetUserAccessTokenAsync();
                    
                    // Simple null check since the method should handle success/failure internally
                    if (!string.IsNullOrEmpty(tokenResult?.AccessToken))
                    {
                        // Add the Bearer token to the proxied request
                        transformContext.ProxyRequest.Headers.Authorization = 
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
                    }
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the request
                    var logger = httpContext.RequestServices.GetService<ILogger<AuthHeaderTransform>>();
                    logger?.LogWarning(ex, "Failed to add auth header to proxied request");
                }
            }
        });
    }
}