namespace BespokeIdp;

using BespokeIdp.Extensions;
using BespokeIdp.Factories;
using Pulumi;
using Pulumi.Keycloak.Inputs;
using Pulumi.Keycloak.OpenId;
using Keycloak = Pulumi.Keycloak;

class RealmBuild : Stack
{
    public RealmBuild()
    {
        // Create BespokeBff realm
        var realm = new Keycloak.Realm("BespokeBff-realm", new Keycloak.RealmArgs
        {
            RealmName = "BespokeBff",
            RegistrationAllowed = true,
            ResetPasswordAllowed = true,
            RememberMe = true,
            EditUsernameAllowed = true
        });

        // Create custom scope for the BFF API
        var bespokeBffScope = ScopeFactory.CreateScope(realm.Id, "bespoke_bff_api");

        // Create BFF Client (Authorization Code Flow with PKCE)
        var bespokeBffClient = ClientFactory.CreateCodeFlowClient(
            realm.Id,
            "bespoke_bff",
            "2274075d-3358-4f59-a13a-ddf4c6906b1e",
            "Bespoke BFF",
            "http://localhost:3118",
            redirectUris: new InputList<string>()
            {
                "http://localhost:3118/signin-oidc",
                "http://localhost:3118/signout-callback-oidc",
                "http://localhost:3118/*",
                "http://localhost:4667/*",
                "https://localhost:3118/signin-oidc",
                "https://localhost:3118/signout-callback-oidc",
                "https://localhost:3118/*",
                "https://localhost:4667/*"
            },
            webOrigins: new InputList<string>()
            {
                "http://localhost:3118",
                "http://localhost:4667",
                "https://localhost:3118",
                "https://localhost:4667"
            }
        );
        bespokeBffClient.ExtendDefaultScopes("bespoke_bff_api");
        bespokeBffClient.AddAudienceMapper("bespoke_bff_api");
        bespokeBffClient.AddTenantMapper();

        // Create Test API Client (for testing purposes)
        var bespokeApiClient = ClientFactory.CreateClientCredentialsFlowClient(
            realm.Id,
            "bespoke_api_machine",
            "dd283422-f6ef-4e28-b373-1d3b9d909f8e",
            "Bespoke API Machine",
            "http://localhost:5160"
        );
        bespokeApiClient.ExtendDefaultScopes("bespoke_bff_api");
        bespokeApiClient.AddAudienceMapper("bespoke_bff_api");
        bespokeApiClient.AddTenantMapper();

        // Create API Client (Code Flow)
        var bespokeBffApiClient = ClientFactory.CreateCodeFlowClient(
            realm.Id,
            "bespoke_bff.api",
            "7f9c2d5e-8b3a-4f6c-9e2d-1a5b8c4d7e9f",
            "Bespoke BFF API",
            "http://localhost:5160",
            redirectUris: null,
            webOrigins: null
        );
        bespokeBffApiClient.ExtendDefaultScopes("bespoke_bff_api");
        bespokeBffApiClient.AddAudienceMapper("bespoke_bff_api");
        bespokeBffApiClient.AddTenantMapper();

        // Create test users
        var adminUser = new Keycloak.User("admin", new Keycloak.UserArgs
        {
            RealmId = realm.Id,
            Username = "admin",
            Enabled = true,
            Email = "admin@example.local",
            FirstName = "Admin",
            LastName = "User",
            InitialPassword = new UserInitialPasswordArgs
            {
                Value = "password123",
                Temporary = false,
            },
            Attributes =
            {
                { "organization-id", "84c294a2-ac18-418f-b4e0-d86ce6b64d1d" }
            }
        });

        var testUser = new Keycloak.User("test", new Keycloak.UserArgs
        {
            RealmId = realm.Id,
            Username = "test",
            Enabled = true,
            Email = "test@example.local",
            FirstName = "Test",
            LastName = "User",
            InitialPassword = new UserInitialPasswordArgs
            {
                Value = "password",
                Temporary = false,
            },
            Attributes =
            {
                { "organization-id", "84c294a2-ac18-418f-b4e0-d86ce6b64d1d" }
            }
        });
    }
}
