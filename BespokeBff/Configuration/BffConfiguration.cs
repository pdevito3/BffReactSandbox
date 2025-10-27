namespace BespokeBff.Configuration;

/// <summary>
/// Static configuration for BFF settings
/// </summary>
public static class BffConfiguration
{
    /// <summary>
    /// Allowed origins for cross-origin redirects
    /// </summary>
    public static string[] AllowedOrigins { get; set; } = [];
}
