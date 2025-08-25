namespace BespokeBff.Endpoints.BFF;

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
            var tokenResult = await context.GetUserAccessTokenAsync();
            
            if (!string.IsNullOrEmpty(tokenResult?.AccessToken))
            {
                return Results.Ok(new { 
                    success = true, 
                    message = "Token refreshed successfully",
                    expiresAt = tokenResult.Expiration.ToString("O")
                });
            }
            else
            {
                return Results.BadRequest(new { 
                    error = "Token refresh failed", 
                    details = "No access token received" 
                });
            }
        }
        catch (Exception ex)
        {
            return Results.Problem($"Token refresh failed: {ex.Message}");
        }
    }
}