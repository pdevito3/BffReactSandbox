namespace BespokeBff.Endpoints.BFF;

using Duende.AccessTokenManagement.OpenIdConnect;
using Microsoft.AspNetCore.Authentication;


public static class RefreshToken
{
    public static async Task<IResult> Handle(HttpContext context)
    {
        if (!context.User.Identity?.IsAuthenticated ?? false)
        {
            return Results.Unauthorized();
        }

        try
        {
            var parameters = new UserTokenRequestParameters
            {
                // force token renewal even if current token is still valid
                ForceRenewal = true
            };
            
            var tokenResult = await context.GetUserAccessTokenAsync(parameters);
            
            if (!string.IsNullOrEmpty(tokenResult?.AccessToken))
            {
                return Results.Ok(new { 
                    success = true, 
                    message = "Token refreshed successfully",
                    expiresAt = tokenResult.Expiration.ToString("O")
                });
            }

            return Results.BadRequest(new { 
                error = "Token refresh failed", 
                details = "No access token received" 
            });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Token refresh failed: {ex.Message}");
        }
    }
}