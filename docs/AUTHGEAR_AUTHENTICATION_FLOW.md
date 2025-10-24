# Authgear Authentication Flow Documentation

## Overview

This document explains how authentication works in the BespokeBFF application using Authgear as the identity provider, covering the complete flow from user login to API authorization.

## Architecture Components

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌────────┐
│   UI    │─────▶│   BFF   │─────▶│ Authgear │      │ AppApi │
│  React  │      │  .NET   │      │   IdP    │      │  .NET  │
└─────────┘      └─────────┘      └──────────┘      └────────┘
    │                 │                  │                │
    │                 │                  │                │
    │   1. Login      │                  │                │
    ├────────────────▶│   2. OIDC Flow   │                │
    │                 ├─────────────────▶│                │
    │                 │◀─────────────────┤ (JWT tokens)   │
    │                 │                  │                │
    │   3. API Call   │   4. Proxy +     │                │
    │   with Cookie   │   Attach JWT     │                │
    ├────────────────▶├──────────────────┼───────────────▶│
    │                 │                  │   5. Validate  │
    │                 │                  │      JWT       │
    │◀────────────────┴──────────────────┴────────────────┤
    │                    6. Protected Data                │
```

---

## 1. Authgear Configuration

### Location
`/authgear/authgear.yaml`

### OAuth Client Configuration

```yaml
oauth:
  clients:
    # BFF Application Client
    - name: "BFF Application"
      client_id: "bff-client"
      # Issue JWT access tokens for API calls
      issue_jwt_access_token: true
      # Traditional web application (server-side)
      x_application_type: traditional_webapp
      # Where Authgear redirects after authentication
      redirect_uris:
        - "http://localhost:3118/signin-oidc"
        - "https://localhost:3118/signin-oidc"
      # Where to redirect after logout
      post_logout_redirect_uris:
        - "http://localhost:3118/signout-callback-oidc"
        - "https://localhost:3118/signout-callback-oidc"
```

### Key Configuration Points

| Setting | Value | Purpose |
|---------|-------|---------|
| `client_id` | `bff-client` | Identifies the BFF to Authgear |
| `issue_jwt_access_token` | `true` | Returns JWT access tokens (not opaque) |
| `x_application_type` | `traditional_webapp` | Enables Authorization Code flow with PKCE |
| `redirect_uris` | BFF callback endpoints | Where Authgear sends auth response |

### Important Notes

- **No Client Secret in YAML**: Client secrets are stored separately in `authgear.secrets.yaml` (not in version control)
- **JWT Audience**: Authgear always sets `aud` claim to the Authgear endpoint (e.g., `http://localhost:3000`)
- **No Custom API Resources**: Authgear doesn't support Auth0-style API audience configuration

---

## 2. BFF Configuration

### Location
`/BespokeBff/Program.cs` (lines 33-133)

### OIDC Authentication Setup

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
})
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    options.Authority = "http://localhost:3000";
    options.ClientId = "bff-client";
    options.ClientSecret = "[from configuration]";
    options.ResponseType = "code";

    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("email");
    options.Scope.Add("profile");
    options.Scope.Add("offline_access"); // For refresh tokens

    options.SaveTokens = true; // Store access/refresh tokens in auth session
    options.UsePkce = true;
});
```

### Token Management (Duende)

```csharp
builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    options.RefreshBeforeExpiration = TimeSpan.FromMinutes(5);
    options.UseChallengeSchemeScopedTokens = true;
});
```

**What This Does:**
- Automatically refreshes access tokens before expiration
- Stores tokens in the authentication session
- Provides tokens to the YARP proxy for API calls

### YARP Proxy Configuration

`/BespokeBff/appsettings.json`:

```json
{
  "ReverseProxy": {
    "Routes": {
      "api-route": {
        "ClusterId": "api-cluster",
        "Match": {
          "Path": "/api/{**catch-all}"
        },
        "Transforms": [
          {
            "PathPattern": "{**catch-all}"
          }
        ]
      }
    },
    "Clusters": {
      "api-cluster": {
        "Destinations": {
          "destination1": {
            "Address": "http://localhost:5097/"
          }
        }
      }
    }
  }
}
```

**Path Transform:**
- Request: `GET /api/health`
- Proxied to: `GET http://localhost:5097/health` (strips `/api` prefix)

### Auth Header Transform

`/BespokeBff/Middleware/AuthHeaderTransform.cs`:

```csharp
public class AuthHeaderTransform : ITransformProvider
{
    public void Apply(TransformBuilderContext transformBuildContext)
    {
        transformBuildContext.AddRequestTransform(async transformContext =>
        {
            // Get access token from authenticated session
            var token = await transformContext.HttpContext
                .GetUserAccessTokenAsync();

            if (!string.IsNullOrEmpty(token))
            {
                // Add to Authorization header for API
                transformContext.ProxyRequest.Headers
                    .Authorization = new AuthenticationHeaderValue("Bearer", token);
            }
        });
    }
}
```

---

## 3. AppApi JWT Validation

### Location
`/AppApi/Program.cs` (lines 11-41)

### JWT Bearer Authentication

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "http://localhost:3000";
        options.Audience = "myapp-api";
        options.RequireHttpsMetadata = false; // Dev only

        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Validate issuer (Authgear endpoint)
            ValidateIssuer = true,
            ValidIssuer = "http://localhost:3000",

            // Validate audience (Authgear endpoint)
            ValidateAudience = true,
            ValidAudience = "http://localhost:3000",

            // Validate token lifetime
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });
```

### Authorization Policy (Client ID Validation)

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("BffClientOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("client_id", "bff-client");
    });
});
```

### Protected Endpoint

```csharp
app.MapGet("/data", (HttpContext context) => { /* ... */ })
    .RequireAuthorization("BffClientOnly");
```

**Security Layers:**
1. ✅ JWT signature validation (via JWKS from Authgear)
2. ✅ Issuer validation (`iss` = `http://localhost:3000`)
3. ✅ Audience validation (`aud` = `http://localhost:3000`)
4. ✅ Lifetime validation (`exp` > current time)
5. ✅ Client ID validation (`client_id` = `bff-client`)

---

## 4. Complete Authentication Flow

### Step-by-Step Flow

#### 1. **User Initiates Login**

**UI → BFF:**
```
GET http://localhost:4667/some-protected-route
```

**BFF Response:**
```
302 Redirect to http://localhost:3118/bff/login?returnUrl=/some-protected-route
```

---

#### 2. **BFF Redirects to Authgear**

**BFF → Authgear:**
```
302 Redirect to http://localhost:3000/oauth2/authorize
  ?client_id=bff-client
  &redirect_uri=http://localhost:3118/signin-oidc
  &response_type=code
  &scope=openid email profile offline_access
  &code_challenge=[PKCE challenge]
  &state=[random state]
```

---

#### 3. **User Authenticates with Authgear**

Authgear presents login UI:
- Email/password
- Social logins (if configured)
- MFA (if enabled)

---

#### 4. **Authgear Redirects Back to BFF**

**Authgear → BFF:**
```
302 Redirect to http://localhost:3118/signin-oidc
  ?code=[authorization_code]
  &state=[original state]
```

---

#### 5. **BFF Exchanges Code for Tokens**

**BFF → Authgear:**
```
POST http://localhost:3000/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=[authorization_code]
&redirect_uri=http://localhost:3118/signin-oidc
&client_id=bff-client
&client_secret=[client_secret]
&code_verifier=[PKCE verifier]
```

**Authgear → BFF:**
```json
{
  "access_token": "eyJ...[JWT]",
  "id_token": "eyJ...[JWT]",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

#### 6. **BFF Creates Session Cookie**

**BFF stores in session:**
- Access token
- Refresh token
- ID token
- User claims

**BFF → UI:**
```
Set-Cookie: __Host-MyAppBFF=[encrypted session];
  Secure; HttpOnly; SameSite=Strict; Path=/

302 Redirect to /some-protected-route
```

---

#### 7. **UI Makes API Call Through BFF**

**UI → BFF:**
```
GET http://localhost:3118/api/data
Cookie: __Host-MyAppBFF=[session]
X-CSRF: 1
```

---

#### 8. **BFF Proxies to AppApi with JWT**

**BFF retrieves access token from session**

**BFF → AppApi:**
```
GET http://localhost:5097/data
Authorization: Bearer eyJ...[JWT access token]
```

---

#### 9. **AppApi Validates JWT**

```
1. Download JWKS from http://localhost:3000/.well-known/jwks.json
2. Verify JWT signature using public key
3. Validate iss claim = "http://localhost:3000"
4. Validate aud claim = "http://localhost:3000"
5. Validate exp > current time
6. Check client_id claim = "bff-client"
```

**If all pass:**
```json
{
  "Message": "✅ Protected data - Full JWT validation passed",
  "UserId": "user123",
  "Email": "user@example.com",
  "ClientId": "bff-client",
  "Claims": [...]
}
```

---

#### 10. **BFF Returns Response to UI**

**BFF → UI:**
```json
{
  "Message": "✅ Protected data - Full JWT validation passed",
  ...
}
```

---

## 5. Token Claims Structure

### Access Token (JWT) Claims

```json
{
  "iss": "http://localhost:3000",
  "aud": "http://localhost:3000",
  "sub": "user_abc123",
  "client_id": "bff-client",
  "email": "user@example.com",
  "email_verified": true,
  "exp": 1698765432,
  "iat": 1698761832,
  "nbf": 1698761832,
  "scope": "openid email profile offline_access"
}
```

### ID Token Claims

```json
{
  "iss": "http://localhost:3000",
  "aud": "bff-client",
  "sub": "user_abc123",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "exp": 1698765432,
  "iat": 1698761832
}
```

**Key Difference:**
- **Access Token**: `aud` = Authgear endpoint (for API validation)
- **ID Token**: `aud` = client_id (for client validation)

---

## 6. Token Refresh Flow

### When Access Token Expires

**Duende Token Management automatically:**

1. Detects token expiration (within 5 minutes of `exp`)
2. Uses refresh token to get new access token
3. Updates session with new tokens

**BFF → Authgear:**
```
POST http://localhost:3000/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=[refresh_token]
&client_id=bff-client
&client_secret=[client_secret]
```

**Authgear → BFF:**
```json
{
  "access_token": "eyJ...[new JWT]",
  "refresh_token": "...[new or same refresh token]",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## 7. Security Considerations

### BFF Security

✅ **Cookie-based sessions** (not exposed to JavaScript)
✅ **CSRF protection** (custom header required)
✅ **SameSite=Strict** (prevents CSRF attacks)
✅ **HttpOnly cookies** (prevents XSS token theft)
✅ **Secure flag** (HTTPS only in production)
✅ **Token storage** (encrypted in ASP.NET Data Protection)

### AppApi Security

✅ **JWT signature validation** (cryptographic verification)
✅ **Issuer validation** (only Authgear tokens accepted)
✅ **Audience validation** (scope limiting)
✅ **Lifetime validation** (no expired tokens)
✅ **Client ID validation** (only BFF can access)
✅ **CORS restrictions** (only BFF origin allowed)

### Authgear Security

✅ **PKCE** (prevents authorization code interception)
✅ **State parameter** (prevents CSRF on callback)
✅ **Secure token storage** (in PostgreSQL + Redis)
✅ **Token rotation** (refresh tokens can be rotated)
✅ **Session management** (revocation support)

---

## 8. Configuration Reference

### Environment Variables

**BFF** (`/BespokeBff/appsettings.Development.json`):
```json
{
  "Authgear": {
    "Authority": "http://localhost:3000",
    "ClientId": "bff-client",
    "ClientSecret": "[your-client-secret]"
  },
  "BffOptions": {
    "AllowedOrigins": ["http://localhost:4667"]
  }
}
```

**AppApi** (`/AppApi/appsettings.json`):
```json
{
  "Authgear": {
    "Authority": "http://localhost:3000",
    "Audience": "myapp-api",
    "ValidIssuer": "http://localhost:3000"
  }
}
```

### Docker Compose

**Authgear** (`/docker-compose.yml`):
```yaml
authgear:
  image: quay.io/theauthgear/authgear-server:latest
  ports:
    - "3000:3000"
  volumes:
    - ./authgear/authgear.yaml:/app/authgear.yaml
    - ./authgear/authgear.secrets.yaml:/app/authgear.secrets.yaml
  environment:
    DEV_MODE: "true"
    DATABASE_URL: "postgres://..."
    REDIS_URL: "redis://..."
```

---

## 9. Troubleshooting

### Common Issues

#### "invalid_client" Error
**Cause:** Client secret mismatch or not configured
**Fix:** Check `authgear.secrets.yaml` and BFF configuration match

#### "invalid_scope" Error
**Cause:** Requesting scopes not allowed for client
**Fix:** Authgear only supports standard OIDC scopes by default

#### 401 Unauthorized on API
**Cause:** JWT validation failed
**Fix:** Check that:
- Authgear is running and accessible
- JWT issuer matches configuration
- JWT hasn't expired
- Client ID is in token

#### 403 Forbidden on API
**Cause:** Client ID validation failed
**Fix:** Ensure JWT has `client_id` claim = `bff-client`

---

## 10. Production Considerations

### Before Going to Production

1. **HTTPS Everywhere**
   - Enable `RequireHttpsMetadata` in BFF and AppApi
   - Use valid SSL certificates
   - Update all URLs to `https://`

2. **Client Secret Security**
   - Use secret management (Azure Key Vault, AWS Secrets Manager)
   - Rotate secrets regularly
   - Never commit secrets to version control

3. **Token Lifetime**
   - Reduce access token lifetime (e.g., 15 minutes)
   - Implement refresh token rotation
   - Add token revocation support

4. **Monitoring**
   - Log authentication failures
   - Monitor token refresh rates
   - Alert on suspicious patterns

5. **CORS Configuration**
   - Restrict to actual production domains
   - Remove wildcard origins
   - Implement proper preflight handling

---

## References

- [Authgear Documentation](https://docs.authgear.com/)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [JWT Best Practices (RFC 8725)](https://tools.ietf.org/html/rfc8725)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)

---

**Last Updated:** October 24, 2025
**Version:** 1.0
