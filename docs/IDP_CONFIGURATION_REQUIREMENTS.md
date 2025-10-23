# IDP Configuration Requirements for BFF Authentication

This document provides comprehensive instructions for configuring any OpenID Connect (OIDC) compliant Identity Provider (IDP) to work with the BespokeBFF authentication system.

## Table of Contents
1. [Overview](#overview)
2. [OIDC/OAuth2 Requirements](#oidcoauth2-requirements)
3. [Application/Client Configuration](#applicationclient-configuration)
4. [User Management](#user-management)
5. [JWT Token Configuration](#jwt-token-configuration)
6. [OAuth Flows and Grants](#oauth-flows-and-grants)
7. [URLs and Endpoints](#urls-and-endpoints)
8. [Scopes and Claims](#scopes-and-claims)
9. [Security Requirements](#security-requirements)
10. [Session and Token Management](#session-and-token-management)
11. [Testing and Validation](#testing-and-validation)
12. [Migration Checklist](#migration-checklist)

---

## Overview

The BespokeBFF implements the **Backend for Frontend (BFF)** pattern with:
- Server-side token storage
- HTTP-only secure cookies
- CSRF protection
- Automatic token refresh
- YARP reverse proxy for API integration

### Current FusionAuth Configuration Reference
- **Authority**: `http://localhost:9011`
- **Client ID**: `f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab`
- **Client Secret**: `2274075d-3358-4f59-a13a-ddf4c6906b1e`
- **BFF URL**: `http://localhost:3118`
- **UI URL**: `http://localhost:4667`

---

## OIDC/OAuth2 Requirements

Your IDP **MUST** support the following OIDC/OAuth2 features:

### 1. Required OIDC Endpoints
The IDP must expose these standard OIDC discovery endpoints:

```
/.well-known/openid-configuration
```

This discovery document must include:
- `authorization_endpoint` - For initiating login
- `token_endpoint` - For exchanging authorization codes
- `userinfo_endpoint` - For retrieving user claims
- `end_session_endpoint` - For logout functionality
- `jwks_uri` - For token validation
- `issuer` - The IDP's issuer identifier

### 2. OIDC Discovery Example
Your IDP should respond to `GET {authority}/.well-known/openid-configuration` with:

```json
{
  "issuer": "https://your-idp.com",
  "authorization_endpoint": "https://your-idp.com/oauth2/authorize",
  "token_endpoint": "https://your-idp.com/oauth2/token",
  "userinfo_endpoint": "https://your-idp.com/oauth2/userinfo",
  "end_session_endpoint": "https://your-idp.com/oauth2/logout",
  "jwks_uri": "https://your-idp.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "email", "profile", "offline_access"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "code_challenge_methods_supported": ["S256"]
}
```

---

## Application/Client Configuration

### 1. Create OAuth2/OIDC Application

In your IDP, create a new application/client with these settings:

#### Basic Settings
| Setting | Value | Description |
|---------|-------|-------------|
| **Application Name** | `My BFF` or your app name | Display name for the application |
| **Application Type** | Web Application | Server-side application type |
| **Client ID** | Generate unique ID | Example: `f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab` |
| **Client Secret** | Generate secure secret | Example: `2274075d-3358-4f59-a13a-ddf4c6906b1e` (use strong random value) |

#### Client Authentication
| Setting | Value | Importance |
|---------|-------|------------|
| **Client Authentication Policy** | Required | MUST require client secret for token exchange |
| **Token Endpoint Auth Method** | `client_secret_basic` or `client_secret_post` | Standard methods supported by .NET |

### 2. Authorized Redirect URLs

Configure these **exact** redirect URLs (including trailing slashes where shown):

```
http://localhost:3118/signin-oidc
https://localhost:3118/signin-oidc
http://localhost:3118/signout-callback-oidc
https://localhost:3118/signout-callback-oidc
http://localhost:3118/
https://localhost:3118/
http://localhost:4667/
https://localhost:4667/
```

**Production URLs** - Replace `localhost` with your actual domains:
```
https://bff.yourdomain.com/signin-oidc
https://bff.yourdomain.com/signout-callback-oidc
https://bff.yourdomain.com/
https://app.yourdomain.com/
```

### 3. Authorized Origin URLs (CORS)

Configure these authorized origins for CORS:

```
http://localhost:3118
https://localhost:3118
http://localhost:4667
https://localhost:4667
```

**Production**:
```
https://bff.yourdomain.com
https://app.yourdomain.com
```

### 4. Logout Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| **Logout URL** | `http://localhost:3118/signout-callback-oidc` | Where to redirect after IDP logout |
| **Logout Behavior** | All Applications | Clear sessions for all apps |
| **Post-Logout Redirect URIs** | Same as redirect URLs | Where user can go after logout |

---

## User Management

### 1. User Schema Requirements

Your IDP must support these user attributes:

#### Required Fields
- **User ID/Subject** (`sub`) - Unique, immutable user identifier (UUID or similar)
- **Email** (`email`) - User's email address
- **Email Verified** (`email_verified`) - Boolean indicating if email is verified
- **Active Status** - Ability to enable/disable user accounts

#### Recommended Fields
- **First Name** (`given_name`)
- **Last Name** (`family_name`)
- **Full Name** (`name`)
- **Profile** (`profile`) - Optional profile URL
- **Picture** (`picture`) - Optional avatar URL

### 2. Test Users

Create at least two test users for development:

#### Admin User
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "email": "admin@example.local",
  "password": "password123",
  "firstName": "Admin",
  "lastName": "User",
  "fullName": "Admin User",
  "active": true,
  "verified": true,
  "roles": ["admin"]
}
```

#### Test User
```json
{
  "id": "00000000-0000-0000-0000-000000000002",
  "email": "test@example.local",
  "password": "password",
  "firstName": "Test",
  "lastName": "User",
  "fullName": "Test User",
  "active": true,
  "verified": true,
  "roles": []
}
```

### 3. User Registration

Configure user registration settings:
- **Require Registration**: `false` - Users can authenticate without explicit app registration
- **Self-Service Registration**: Enable if you want users to sign up
- **Email Verification**: Enable for production environments

---

## JWT Token Configuration

### 1. ID Token Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Enabled** | `true` | Must issue ID tokens |
| **Algorithm** | `RS256` | RSA signature with SHA-256 |
| **Time to Live** | `3600` seconds (1 hour) | ID token expiration |
| **Issuer** | Your IDP authority URL | Must match discovery document |
| **Audience** | Client ID | Should be the application's client ID |

### 2. Access Token Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Enabled** | `true` | Required for API access |
| **Algorithm** | `RS256` | RSA signature with SHA-256 |
| **Time to Live** | `3600` seconds (1 hour) | Access token expiration |
| **Format** | JWT | Must be JWT format for validation |

### 3. Refresh Token Configuration

**CRITICAL**: Refresh tokens are essential for the BFF pattern.

| Setting | Value | Description |
|---------|-------|-------------|
| **Generate Refresh Tokens** | `true` | **MUST** be enabled |
| **Refresh Token Time to Live** | `43200` minutes (30 days) | How long refresh tokens are valid |
| **Refresh Token Usage Policy** | `Reusable` | Tokens can be used multiple times |
| **Allow Token Refresh** | `true` | Enable token refresh capability |
| **Sliding Expiration** | `true` (optional) | Extend expiration on use |

**Why Refresh Tokens Matter**:
- The BFF stores tokens server-side
- Access tokens expire after 1 hour
- Refresh tokens allow automatic token renewal without re-login
- Users maintain sessions for 30 days without interruption

---

## OAuth Flows and Grants

### 1. Enabled Grant Types

Your IDP **MUST** support these grant types:

```json
{
  "enabledGrants": [
    "authorization_code",
    "refresh_token"
  ]
}
```

**DO NOT enable**:
- `implicit` - Deprecated and insecure
- `password` - Not suitable for web apps
- `client_credentials` - For machine-to-machine only

### 2. Authorization Code Flow

The BFF uses the **Authorization Code Flow** with PKCE:

1. User clicks login
2. BFF redirects to IDP authorization endpoint
3. User authenticates at IDP
4. IDP redirects back with authorization code
5. BFF exchanges code for tokens at token endpoint
6. BFF stores tokens server-side
7. BFF creates session cookie for user

### 3. PKCE (Proof Key for Code Exchange)

**REQUIRED**: PKCE must be enabled and enforced.

| Setting | Value | Description |
|---------|-------|-------------|
| **PKCE Policy** | `Required` | Enforce PKCE for all auth code flows |
| **Code Challenge Method** | `S256` | SHA-256 hashing |

The .NET BFF automatically handles PKCE via `options.UsePkce = true`.

---

## URLs and Endpoints

### 1. BFF Callback Endpoints

The .NET BFF exposes these callback endpoints for OIDC:

| Path | Purpose | Notes |
|------|---------|-------|
| `/signin-oidc` | Authorization code callback | Where IDP redirects after login |
| `/signout-callback-oidc` | Post-logout callback | Where IDP redirects after logout |
| `/signout-oidc` | Logout initiation | Internal endpoint for logout |

### 2. IDP Endpoint URLs

Configure your .NET `appsettings.json` with:

```json
{
  "FusionAuth": {
    "Authority": "https://your-idp.com",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "Audience": "your-client-id"
  }
}
```

The `Authority` URL must:
- Be accessible from the BFF server
- Support HTTPS in production
- Host the `.well-known/openid-configuration` endpoint

### 3. Environment-Specific URLs

#### Development
```
Authority: http://localhost:9011
BFF URL: http://localhost:3118
UI URL: http://localhost:4667
```

#### Staging
```
Authority: https://auth-staging.yourdomain.com
BFF URL: https://bff-staging.yourdomain.com
UI URL: https://app-staging.yourdomain.com
```

#### Production
```
Authority: https://auth.yourdomain.com
BFF URL: https://bff.yourdomain.com
UI URL: https://app.yourdomain.com
```

---

## Scopes and Claims

### 1. Required Scopes

The BFF requests these scopes during authentication:

| Scope | Purpose | Required |
|-------|---------|----------|
| `openid` | Enable OIDC authentication | **YES** |
| `email` | Access user's email address | **YES** |
| `profile` | Access user's profile info (name, etc.) | **YES** |
| `offline_access` | Request refresh tokens | **YES** |

Configure these in your IDP as available scopes.

### 2. Required Claims in ID Token

The ID token **MUST** include these claims:

```json
{
  "sub": "unique-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "given_name": "User",
  "family_name": "Name",
  "iss": "https://your-idp.com",
  "aud": "your-client-id",
  "exp": 1234567890,
  "iat": 1234567890,
  "auth_time": 1234567890
}
```

### 3. Claims Mapping

The BFF maps claims as follows:

| .NET Claim Type | OIDC Claim | Source |
|-----------------|------------|--------|
| `NameClaimType` | `email` | Configured in `TokenValidationParameters` |
| `RoleClaimType` | `role` | For authorization |
| `sub` | `sub` | Unique user identifier |

This is configured in `Program.cs:98-102`:

```csharp
options.TokenValidationParameters = new TokenValidationParameters
{
    NameClaimType = "email",
    RoleClaimType = ClaimTypes.Role
};
```

### 4. UserInfo Endpoint Claims

The UserInfo endpoint should return additional claims not in ID token:

```json
{
  "sub": "unique-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "given_name": "User",
  "family_name": "Name",
  "picture": "https://cdn.example.com/avatar.jpg",
  "updated_at": 1234567890
}
```

Enable in .NET via:
```csharp
options.GetClaimsFromUserInfoEndpoint = true;
```

---

## Security Requirements

### 1. HTTPS Requirements

#### Development
- HTTP is acceptable for `localhost`
- Configure with `options.RequireHttpsMetadata = !builder.Environment.IsDevelopment()`

#### Production
- **MUST** use HTTPS for all endpoints
- **MUST** use secure cookies (`options.Cookie.SecurePolicy = CookieSecurePolicy.Always`)
- **MUST** validate HTTPS metadata (`options.RequireHttpsMetadata = true`)

### 2. Cookie Security Settings

The BFF uses these secure cookie settings:

```csharp
options.Cookie.Name = "__Host-MyAppBFF";
options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
options.Cookie.SameSite = SameSiteMode.Strict;
options.Cookie.HttpOnly = true;
options.ExpireTimeSpan = TimeSpan.FromHours(1);
options.SlidingExpiration = true;
```

**Cookie Prefix**: The `__Host-` prefix enforces:
- Secure flag must be set
- Path must be `/`
- Domain attribute must not be specified

### 3. CORS Configuration

The IDP must allow CORS requests from the BFF and UI:

**Allowed Origins**:
- `http://localhost:3118` (BFF)
- `http://localhost:4667` (UI)
- Production domains

**Allowed Methods**:
- `GET`, `POST`, `OPTIONS`

**Allowed Headers**:
- `Authorization`
- `Content-Type`
- `X-CSRF`

**Credentials**:
- Must allow credentials (`Access-Control-Allow-Credentials: true`)

### 4. CSRF Protection

The BFF implements CSRF protection via custom middleware:

- **Header Name**: `X-CSRF`
- **Required Value**: `1`
- **Applied To**: All authenticated POST/PUT/PATCH/DELETE requests
- **Excluded Paths**: Login, logout, health check endpoints

The frontend **MUST** include this header:
```typescript
headers: {
  "X-CSRF": "1"
}
```

See `BespokeBff/Middleware/CsrfMiddleware.cs:1-167` for implementation.

---

## Session and Token Management

### 1. Session Duration

| Setting | Value | Configured In |
|---------|-------|---------------|
| **Cookie Expiration** | 1 hour | `Program.cs:40` |
| **Sliding Expiration** | Enabled | `Program.cs:41` |
| **Access Token TTL** | 1 hour (3600s) | IDP configuration |
| **Refresh Token TTL** | 30 days (43200 min) | IDP configuration |

### 2. Automatic Token Refresh

The BFF uses **Duende Access Token Management** for automatic refresh:

```csharp
builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    options.RefreshBeforeExpiration = TimeSpan.FromMinutes(5);
    options.UseChallengeSchemeScopedTokens = true;
});
```

**How it works**:
1. Access token expires after 1 hour
2. Duende checks token expiration before API calls
3. If token expires in < 5 minutes, automatically refreshes
4. Uses refresh token to get new access token
5. User session continues uninterrupted

### 3. Token Storage

**Server-Side Only**:
- Tokens are stored in server-side authentication session
- Frontend never sees tokens
- Only session cookie is sent to browser

Configured via:
```csharp
options.SaveTokens = true; // Store in auth session
```

### 4. Token Revocation on Logout

The BFF automatically revokes refresh tokens on logout:

```csharp
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
```

Your IDP **SHOULD** support the token revocation endpoint:
```
POST /oauth2/revoke
```

See `Program.cs:44-54` for implementation.

---

## Testing and Validation

### 1. OIDC Discovery Validation

Test that your IDP's discovery endpoint is accessible:

```bash
curl https://your-idp.com/.well-known/openid-configuration | jq
```

Verify it returns all required endpoints.

### 2. Test Authorization Flow

Manual testing steps:

1. **Start services**: BFF, UI, and IDP
2. **Visit UI**: `http://localhost:4667`
3. **Click Login**: Should redirect to IDP
4. **Enter credentials**: Use test user
5. **Verify redirect**: Should redirect back to BFF `/signin-oidc`
6. **Check session**: Should set `__Host-MyAppBFF` cookie
7. **Verify user info**: Call `/bff/user` to see claims
8. **Test logout**: Should clear session and redirect

### 3. Test Token Refresh

```bash
# 1. Login and capture session cookie
curl -v -c cookies.txt http://localhost:3118/bff/login

# 2. Get user info (should work)
curl -b cookies.txt http://localhost:3118/bff/user

# 3. Trigger token refresh
curl -X POST -H "X-CSRF: 1" -b cookies.txt http://localhost:3118/bff/refresh

# 4. Verify still authenticated
curl -b cookies.txt http://localhost:3118/bff/user
```

### 4. Validate JWT Tokens

If you have access to the IDP admin:

1. Login via BFF
2. Capture access token from BFF session (debug mode)
3. Decode at jwt.io
4. Verify:
   - `iss` matches IDP authority
   - `aud` matches client ID
   - `exp` is ~1 hour from `iat`
   - Contains expected claims

### 5. Test CSRF Protection

```bash
# Without CSRF header (should fail with 400)
curl -X POST -b cookies.txt http://localhost:3118/bff/refresh

# With CSRF header (should succeed)
curl -X POST -H "X-CSRF: 1" -b cookies.txt http://localhost:3118/bff/refresh
```

---

## Migration Checklist

Use this checklist when migrating from FusionAuth to a different IDP:

### IDP Configuration
- [ ] Create new OIDC/OAuth2 application in IDP
- [ ] Generate client ID and client secret
- [ ] Configure redirect URLs (signin, signout)
- [ ] Configure logout URLs and behavior
- [ ] Enable PKCE and set to required
- [ ] Enable authorization code grant
- [ ] Enable refresh token grant
- [ ] Configure JWT token lifetimes (1 hour access, 30 days refresh)
- [ ] Configure refresh token policy as reusable
- [ ] Set up CORS origins
- [ ] Create test users (admin and regular)
- [ ] Verify OIDC discovery endpoint is accessible

### Scopes and Claims
- [ ] Enable `openid` scope
- [ ] Enable `email` scope
- [ ] Enable `profile` scope
- [ ] Enable `offline_access` scope (for refresh tokens)
- [ ] Configure ID token to include `sub`, `email`, `name` claims
- [ ] Configure UserInfo endpoint to return profile claims
- [ ] Test claims mapping in BFF

### BFF Configuration
- [ ] Update `appsettings.json` with new IDP authority
- [ ] Update `appsettings.json` with new client ID
- [ ] Update `appsettings.json` with new client secret
- [ ] Update audience if different from client ID
- [ ] Verify `RequireHttpsMetadata` setting matches environment
- [ ] Update any IDP-specific event handlers in `Program.cs`
- [ ] Test logout redirect logic (some IDPs require custom handling)

### Security Verification
- [ ] Verify HTTPS is enforced in production
- [ ] Test cookie is set with `__Host-` prefix
- [ ] Verify cookie has `Secure`, `HttpOnly`, and `SameSite=Strict`
- [ ] Test CSRF protection is working
- [ ] Verify CORS is properly configured
- [ ] Test that tokens are not exposed to frontend
- [ ] Verify token refresh is working automatically

### Functional Testing
- [ ] Test login flow end-to-end
- [ ] Test logout flow end-to-end
- [ ] Test session persistence across page refreshes
- [ ] Test automatic token refresh (wait for token to expire)
- [ ] Test CSRF protection on state-changing endpoints
- [ ] Test proxied API calls receive bearer token
- [ ] Test that expired sessions redirect to login
- [ ] Test that logout revokes refresh tokens

### Documentation
- [ ] Document new IDP-specific configuration
- [ ] Update environment variables documentation
- [ ] Update deployment documentation
- [ ] Create runbook for IDP issues
- [ ] Document any IDP-specific quirks or workarounds

---

## Common IDP Examples

### Auth0 Configuration

```json
{
  "name": "My BFF",
  "application_type": "regular_web",
  "grant_types": ["authorization_code", "refresh_token"],
  "callbacks": [
    "http://localhost:3118/signin-oidc",
    "http://localhost:4667/"
  ],
  "allowed_logout_urls": [
    "http://localhost:3118/signout-callback-oidc"
  ],
  "web_origins": [
    "http://localhost:3118",
    "http://localhost:4667"
  ],
  "token_endpoint_auth_method": "client_secret_post"
}
```

**Authority**: `https://your-tenant.auth0.com`

### Okta Configuration

```json
{
  "label": "My BFF",
  "grant_types": ["authorization_code", "refresh_token"],
  "redirect_uris": [
    "http://localhost:3118/signin-oidc"
  ],
  "post_logout_redirect_uris": [
    "http://localhost:3118/signout-callback-oidc"
  ],
  "response_types": ["code"],
  "application_type": "web",
  "token_endpoint_auth_method": "client_secret_basic"
}
```

**Authority**: `https://your-domain.okta.com/oauth2/default`

### Azure AD / Entra ID Configuration

```json
{
  "displayName": "My BFF",
  "signInAudience": "AzureADMyOrg",
  "web": {
    "redirectUris": [
      "http://localhost:3118/signin-oidc"
    ],
    "logoutUrl": "http://localhost:3118/signout-callback-oidc"
  },
  "requiredResourceAccess": [
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        {
          "id": "openid",
          "type": "Scope"
        },
        {
          "id": "email",
          "type": "Scope"
        },
        {
          "id": "profile",
          "type": "Scope"
        }
      ]
    }
  ]
}
```

**Authority**: `https://login.microsoftonline.com/{tenant-id}/v2.0`

### Keycloak Configuration

```json
{
  "clientId": "my-bff",
  "name": "My BFF",
  "protocol": "openid-connect",
  "publicClient": false,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "redirectUris": [
    "http://localhost:3118/signin-oidc"
  ],
  "webOrigins": [
    "http://localhost:3118",
    "http://localhost:4667"
  ],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

**Authority**: `https://your-keycloak.com/realms/{realm-name}`

---

## Troubleshooting

### Issue: "Invalid redirect_uri"
**Cause**: Redirect URL mismatch between BFF config and IDP config
**Solution**:
- Verify exact match including protocol, port, and path
- Check for trailing slashes
- Ensure redirect URLs are registered in IDP

### Issue: "Refresh tokens not issued"
**Cause**: `offline_access` scope not requested or refresh tokens not enabled
**Solution**:
- Add `offline_access` scope in BFF configuration
- Enable refresh token grant in IDP
- Verify refresh token settings in application config

### Issue: "CORS errors in browser"
**Cause**: IDP not configured to allow requests from UI origin
**Solution**:
- Add UI origin to IDP's authorized origins/CORS config
- Ensure credentials are allowed in CORS policy
- Check browser console for specific CORS error details

### Issue: "Token validation failed"
**Cause**: Token signature validation or audience mismatch
**Solution**:
- Verify `Audience` in appsettings matches token `aud` claim
- Check IDP's JWKS endpoint is accessible
- Ensure token issuer matches IDP authority

### Issue: "Logout doesn't clear IDP session"
**Cause**: IDP logout endpoint not properly configured
**Solution**:
- Verify end_session_endpoint in OIDC discovery
- Configure logout redirect in `OnRedirectToIdentityProviderForSignOut` event
- Check IDP's logout URL format and required parameters

### Issue: "Session expires too quickly"
**Cause**: Access token lifetime is too short and refresh isn't working
**Solution**:
- Verify refresh tokens are being stored (`SaveTokens = true`)
- Check Duende token management is configured
- Increase access token lifetime to match session expectations

---

## Additional Resources

### BFF Pattern
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Backend for Frontend Authentication Pattern](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps-19)

### OIDC Specifications
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

### .NET Security
- [ASP.NET Core Authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/)
- [OpenID Connect in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/oidc)
- [Duende Access Token Management](https://docs.duendesoftware.com/identityserver/v6/tokens/token_management/)

### Security Best Practices
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## Appendix: Configuration Files

### Example appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "FusionAuth": {
    "Authority": "https://your-idp.com",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "Audience": "your-client-id"
  },
  "ReverseProxy": {
    "Routes": {
      "api-route": {
        "ClusterId": "api-cluster",
        "Match": {
          "Path": "/api/{**catch-all}"
        }
      }
    },
    "Clusters": {
      "api-cluster": {
        "Destinations": {
          "destination1": {
            "Address": "https://your-api.com/"
          }
        }
      }
    }
  }
}
```

### Example Program.cs OIDC Configuration

```csharp
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

    options.Events.OnSigningOut = async e =>
    {
        await e.HttpContext.RevokeRefreshTokenAsync();
    };
})
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    var idpConfig = builder.Configuration.GetSection("FusionAuth");

    options.Authority = idpConfig["Authority"];
    options.ClientId = idpConfig["ClientId"];
    options.ClientSecret = idpConfig["ClientSecret"];
    options.ResponseType = "code";

    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("email");
    options.Scope.Add("profile");
    options.Scope.Add("offline_access");

    options.CallbackPath = "/signin-oidc";
    options.SignedOutCallbackPath = "/signout-callback-oidc";
    options.RemoteSignOutPath = "/signout-oidc";

    options.GetClaimsFromUserInfoEndpoint = true;
    options.SaveTokens = true;
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.UsePkce = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = "email",
        RoleClaimType = ClaimTypes.Role
    };
});

// Add token management
builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    options.RefreshBeforeExpiration = TimeSpan.FromMinutes(5);
    options.UseChallengeSchemeScopedTokens = true;
});
```

### Example Frontend Configuration

```typescript
// src/lib/api.ts
import axios from "axios";

const BFF_BASE_URL = process.env.VITE_BFF_URL || "http://localhost:3118";

export const myAppBff = axios.create({
  baseURL: BFF_BASE_URL + "/bff",
  headers: {
    "X-CSRF": "1",
  },
  withCredentials: true,
});

myAppBff.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      window.location.href = BFF_BASE_URL + "/bff/login";
    }
    throw error;
  }
);
```

---

## Summary

This document provides a complete specification for configuring any OIDC-compliant IDP to work with the BespokeBFF authentication system. The key requirements are:

1. **OIDC Discovery** - Support standard discovery endpoint
2. **Authorization Code Flow** - With PKCE enabled
3. **Refresh Tokens** - Essential for long-lived sessions
4. **Proper Redirect URLs** - Exact match required
5. **CORS Configuration** - Allow credentials from BFF and UI
6. **JWT Tokens** - With appropriate lifetimes and claims
7. **Logout Support** - With post-logout redirect
8. **Scopes** - openid, email, profile, offline_access

Follow the migration checklist to ensure a smooth transition to your chosen IDP.
