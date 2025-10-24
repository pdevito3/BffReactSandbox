namespace BespokeBff.Configuration;

public class BffOptions
{
    public const string SectionName = "Bff";

    public string[] AllowedOrigins { get; set; } = [];
}
