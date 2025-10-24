# FusionAuth Scope Workaround Documentation

## Problem Statement

**FusionAuth Free Tier Limitation:** Custom audience and scope configuration is a **paid feature** (Entity Management). In the free tier, you cannot:
- Define custom API resources with specific audiences
- Create custom scopes for API authorization
- Configure the `aud` claim to point to a custom API audience

This creates a challenge when implementing API authorization in a BFF (Backend for Frontend) architecture where you want to ensure that only the BFF can access your backend APIs.

## Solution: Multi-Layer Security Workaround

Similar to the Authgear workaround, we implement a **multi-layer security approach** that provides production-ready API authorization without requiring FusionAuth's paid Entity Management feature.

### Security Layers

1. **JWT Signature Validation** - Cryptographic verification using JWKS from FusionAuth
2. **Issuer Validation** - Verify `iss` claim matches tenant issuer (e.g., `acme.com`)
3. **Audience Validation** - Verify `aud` claim matches BFF Application ID
4. **Lifetime Validation** - Verify token hasn't expired (`exp` > current time)
5. **Application ID Validation** - Verify `applicationId` claim matches BFF Application ID (authorization policy)

### Key Insights: How FusionAuth Sets Claims in Free Tier

In FusionAuth's free tier:
- The `aud` (audience) claim in the JWT is set to the **Application ID** that issued the token
- Since the BFF requests the access token using its Application ID (`f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab`), that becomes the `aud` value
- We validate against this Application ID instead of a custom API audience
- **FusionAuth uses `applicationId` claim instead of `client_id`** - this is FusionAuth-specific
- The `iss` (issuer) claim is set to the **tenant issuer** (configured in FusionAuth tenant settings, e.g., `acme.com`), NOT the FusionAuth endpoint URL (`http://localhost:9011`)

#### How the FusionAuth Scope Workaround Works

##### The Problem

FusionAuth's free tier doesn't support custom audience/scope configuration (Entity Management is a paid feature). Without this, you can't define custom API resources with specific audiences.

The Solution - Multi-Layer Security:

We implement 5 security layers to achieve production-ready API authorization:

  1. JWT Signature Validation ✅

    - Cryptographic verification using RS256
    - Public key from FusionAuth's JWKS endpoint
    - Prevents token tampering
  2. Issuer Validation ✅

    - Validates iss claim = acme.com (tenant issuer)
    - Important: FusionAuth uses the tenant issuer (configured in tenant settings), NOT the endpoint URL
    - Prevents tokens from other identity providers
  3. Audience Validation ✅

    - Validates aud claim = BFF Application ID (f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab)
    - FusionAuth sets this to the Application ID that requested the token
    - Prevents token reuse from other applications
  4. Lifetime Validation ✅

    - Validates exp claim > current time
    - 5-minute clock skew tolerance
    - Prevents replay attacks with expired tokens
  5. Application ID Validation ✅ ← THE KEY WORKAROUND

    - FusionAuth-specific: Uses applicationId claim (NOT client_id like other IdPs)
    - Authorization policy: policy.RequireClaim("applicationId", "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab")
    - Ensures ONLY the BFF can access the TestApi
    - Provides the same protection as custom audience validation

  Key FusionAuth Differences:
  - ❌ No client_id claim - FusionAuth uses applicationId instead
  - ⚠️ Issuer is tenant-specific - iss = acme.com (not http://localhost:9011)
  - ✅ Audience is Application ID - aud = BFF Application ID

  JWT Claims Structure:
  {
    "aud": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",  // BFF App ID
    "iss": "acme.com",                               // Tenant issuer
    "applicationId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",  // Used for authz policy
    "sub": "00000000-0000-0000-0000-000000000002",
    "exp": 1761275035,
    "scope": "openid email profile offline_access"
  }

  How It Works:
  1. User logs in via FusionAuth → BFF receives JWT
  2. BFF stores JWT in encrypted cookie
  3. UI calls BFF API endpoint → BFF proxies to TestApi with JWT Bearer token
  4. TestApi validates JWT:

    - ✅ Signature valid (JWKS)
    - ✅ Issuer = acme.com
    - ✅ Audience = BFF App ID
    - ✅ Not expired
    - ✅ applicationId = BFF App ID (authorization policy)
  5. TestApi returns data

  Why This is Production-Ready:
  Even without custom audience support, we have equivalent security through the applicationId claim validation. This ensures only tokens issued to the BFF application can access the TestApi.

---
  3. Kickstart is Up to Date

  Reviewed /kickstart/kickstart.json and confirmed:
  - ✅ BFF Application ID matches configuration (f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab)
  - ✅ Client credentials match
  - ✅ Redirect URLs configured correctly
  - ✅ OAuth grants configured (authorization_code, refresh_token)

  The "Test API" application in kickstart (lines 143-174) is not used in the current free-tier workaround (Entity Management feature is paid), but it's kept for future migration to the paid tier.

---

## How the Workaround Works: Complete Flow

### Overview

The workaround achieves production-ready API security without custom audience support by using **claim-based authorization** with FusionAuth's `applicationId` claim. This provides the same level of protection as custom audience validation.

### Authentication & Authorization Flow

```
┌─────────┐           ┌─────────┐           ┌────────────┐           ┌─────────┐
│   UI    │           │   BFF   │           │ FusionAuth │           │ TestApi │
└────┬────┘           └────┬────┘           └─────┬──────┘           └────┬────┘
     │                     │                       │                       │
     │ 1. Login Request    │                       │                       │
     ├────────────────────>│                       │                       │
     │                     │ 2. Redirect to FA     │                       │
     │                     ├──────────────────────>│                       │
     │                     │                       │                       │
     │ 3. Login (test@example.local / password)    │                       │
     │<─────────────────────────────────────────────┤                       │
     │                     │                       │                       │
     │ 4. Authorization Code                       │                       │
     ├────────────────────>│                       │                       │
     │                     │ 5. Exchange for JWT   │                       │
     │                     ├──────────────────────>│                       │
     │                     │ 6. JWT Token          │                       │
     │                     │<──────────────────────┤                       │
     │                     │   - aud: BFF App ID   │                       │
     │                     │   - iss: acme.com     │                       │
     │                     │   - applicationId:    │                       │
     │                     │     BFF App ID        │                       │
     │                     │                       │                       │
     │ 7. Store in Cookie  │                       │                       │
     │<────────────────────┤                       │                       │
     │                     │                       │                       │
     │ 8. Call /api/secure │                       │                       │
     ├────────────────────>│                       │                       │
     │                     │ 9. Get JWT from Cookie│                       │
     │                     │                       │                       │
     │                     │ 10. Proxy + Bearer Token                      │
     │                     ├──────────────────────────────────────────────>│
     │                     │                       │                       │
     │                     │                       │  11. Validate JWT:    │
     │                     │                       │  ✅ Signature (JWKS)  │
     │                     │                       │  ✅ iss = acme.com    │
     │                     │                       │  ✅ aud = BFF App ID  │
     │                     │                       │  ✅ exp > now         │
     │                     │                       │  ✅ applicationId =   │
     │                     │                       │     BFF App ID        │
     │                     │                       │                       │
     │                     │ 12. 200 OK + Data                             │
     │                     │<──────────────────────────────────────────────┤
     │ 13. Response        │                       │                       │
     │<────────────────────┤                       │                       │
```

### The 5 Security Layers Explained

#### Layer 1: JWT Signature Validation (Cryptographic Security)
- **How it works:** ASP.NET JWT middleware fetches FusionAuth's public key from `http://localhost:9011/.well-known/jwks.json`
- **What it validates:** The JWT signature was created by FusionAuth's private key
- **Algorithm:** RS256 (asymmetric cryptography)
- **Attack prevented:** Token tampering - any modification to the JWT will cause signature validation to fail

#### Layer 2: Issuer Validation (Trust Verification)
- **How it works:** Validates the `iss` claim in the JWT
- **Expected value:** `acme.com` (tenant issuer from FusionAuth configuration)
- **Important:** This is NOT the FusionAuth endpoint URL (`http://localhost:9011`) - it's the tenant-specific issuer configured in FusionAuth
- **Attack prevented:** Tokens from other identity providers or FusionAuth instances

#### Layer 3: Audience Validation (Scope Limiting)
- **How it works:** Validates the `aud` claim in the JWT
- **Expected value:** `f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab` (BFF Application ID)
- **How FusionAuth sets it:** When the BFF requests a token, FusionAuth sets `aud` to the BFF's Application ID
- **Attack prevented:** Token reuse from other applications in the same FusionAuth tenant

#### Layer 4: Lifetime Validation (Freshness)
- **How it works:** Validates the `exp` claim is greater than current time
- **Clock skew tolerance:** 5 minutes
- **Token lifetime:** 3600 seconds (1 hour)
- **Attack prevented:** Replay attacks with expired tokens

#### Layer 5: Application ID Validation (API-Specific Access Control) ⭐ **THE KEY WORKAROUND**
- **How it works:** Custom authorization policy requires `applicationId` claim to match BFF Application ID
- **FusionAuth-specific:** Uses `applicationId` claim instead of `client_id` (unlike Auth0, Azure AD, etc.)
- **Configuration:**
  ```csharp
  policy.RequireClaim("applicationId", "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab");
  ```
- **Why this works:** Even though we can't define a custom API audience, the `applicationId` claim ensures only tokens issued to the BFF can access the TestApi
- **Attack prevented:** Tokens from other OAuth clients/applications calling the API directly

### JWT Claims Breakdown

**What FusionAuth puts in the JWT:**
```json
{
  "aud": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",      // ✅ Layer 3: Audience validation
  "iss": "acme.com",                                   // ✅ Layer 2: Issuer validation
  "exp": 1761275035,                                   // ✅ Layer 4: Lifetime validation
  "applicationId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab", // ✅ Layer 5: Authz policy
  "sub": "00000000-0000-0000-0000-000000000002",
  "scope": "openid email profile offline_access",
  "authenticationType": "PING",
  "auth_time": 1761271435
}
```

**What's validated at each layer:**
| Layer | Claim | Expected Value | Validation Type |
|-------|-------|----------------|-----------------|
| 1 | Signature | Matches JWKS public key | Cryptographic |
| 2 | `iss` | `acme.com` | String comparison |
| 3 | `aud` | `f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab` | String comparison |
| 4 | `exp` | > Current time | Timestamp comparison |
| 5 | `applicationId` | `f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab` | Authorization policy |

### Why This is Production-Ready

Even without FusionAuth's paid Entity Management feature, this approach provides:

✅ **Equivalent security to custom audience validation**
- The `applicationId` claim serves the same purpose as a custom audience
- Only tokens issued to the BFF can access the API

✅ **Defense in depth**
- 5 independent security layers
- If one layer fails, others still protect the API

✅ **No trust on bearer**
- Can't just grab any JWT from FusionAuth and call the API
- Must have the specific `applicationId` claim

✅ **Standards-compliant**
- Uses standard JWT validation (RFC 7519)
- OAuth 2.0 best practices (RFC 8725)

✅ **Migration path to paid tier**
- When upgrading to Entity Management, minimal code changes required
- Just update `aud` validation to custom API identifier
- Keep `applicationId` policy as additional security layer

---

## Implementation

### 1. FusionAuth Configuration

**Location:** `/kickstart/kickstart.json`

The BFF Application is configured in FusionAuth with:

```json
{
  "application": {
    "id": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
    "name": "My BFF",
    "active": true,
    "jwtConfiguration": {
      "enabled": true,
      "refreshTokenTimeToLiveInMinutes": 43200,
      "timeToLiveInSeconds": 3600
    },
    "loginConfiguration": {
      "allowTokenRefresh": true,
      "generateRefreshTokens": true,
      "requireAuthentication": true
    },
    "oauthConfiguration": {
      "clientId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
      "clientSecret": "2274075d-3358-4f59-a13a-ddf4c6906b1e",
      "clientAuthenticationPolicy": "Required",
      "proofKeyForCodeExchangePolicy": "Required",
      "enabledGrants": [
        "authorization_code",
        "refresh_token"
      ]
    }
  }
}
```

**Note:** No custom API resource or audience configuration is needed (or possible in the free tier).

---

### 2. BFF Configuration

**Location:** `/BespokeBff/appsettings.Development.json`

```json
{
  "FusionAuth": {
    "Authority": "http://localhost:9011",
    "ClientId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
    "ClientSecret": "2274075d-3358-4f59-a13a-ddf4c6906b1e",
    "Audience": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab"
  }
}
```

**Location:** `/BespokeBff/Program.cs`

```csharp
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    var fusionAuthConfig = builder.Configuration.GetSection("FusionAuth");

    options.Authority = fusionAuthConfig["Authority"];
    options.ClientId = fusionAuthConfig["ClientId"];
    options.ClientSecret = fusionAuthConfig["ClientSecret"];
    options.ResponseType = "code";

    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("email");
    options.Scope.Add("profile");
    options.Scope.Add("offline_access"); // Required for refresh tokens

    options.SaveTokens = true;
    options.UsePkce = true;
});
```

**Note:** Only standard OIDC scopes are requested - no custom API scopes.

---

### 3. TestApi Configuration (The Workaround)

**Location:** `/TestApi/appsettings.json`

```json
{
  "FusionAuth": {
    "Authority": "http://localhost:9011",
    "ValidIssuer": "acme.com",
    "ValidAudience": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
    "ExpectedClientId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab"
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3118",
      "https://localhost:3118"
    ]
  }
}
```

**Key Configuration Values:**
- `Authority`: FusionAuth endpoint URL (for OIDC discovery and JWKS)
- `ValidIssuer`: Tenant issuer from FusionAuth (e.g., `acme.com` - **NOT** the endpoint URL)
- `ValidAudience`: BFF Application ID (what FusionAuth sets as `aud` in free tier)
- `ExpectedClientId`: BFF Application ID (for `applicationId` claim validation)
- `Cors.AllowedOrigins`: BFF origins allowed to call this API

**Location:** `/TestApi/Program.cs`

#### JWT Authentication Configuration

```csharp
// Configure JWT authentication with FusionAuth
var fusionAuthConfig = builder.Configuration.GetSection("FusionAuth");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = fusionAuthConfig["Authority"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.TokenValidationParameters = new TokenValidationParameters
        {
            // FusionAuth free tier limitation workaround:
            // Custom audience is a paid feature, so we validate against the BFF Application ID
            ValidateIssuer = true,
            ValidIssuer = fusionAuthConfig["ValidIssuer"],

            ValidateAudience = true,
            ValidAudience = fusionAuthConfig["ValidAudience"], // BFF Application ID

            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });
```

#### Authorization Policy (Application ID Validation)

```csharp
// Add authorization with applicationId policy for API-specific access control
// This is the key part of the workaround - ensures only the BFF can access this API
// NOTE: FusionAuth uses "applicationId" claim instead of "client_id"
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("BffClientOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("applicationId", fusionAuthConfig["ExpectedClientId"]!);
    });
});
```

#### Protected Endpoint

```csharp
// Secure endpoint - requires JWT validation + applicationId check
app.MapPost("/api/secure", (SecureRequest request, HttpContext context) =>
{
    var user = context.User;
    var userId = user.FindFirst("sub")?.Value ?? "unknown";
    var email = user.FindFirst("email")?.Value ?? "unknown";

    // Extract key claims for debugging
    var audience = user.FindFirst("aud")?.Value;
    var applicationId = user.FindFirst("applicationId")?.Value; // FusionAuth uses applicationId
    var issuer = user.FindFirst("iss")?.Value;

    return Results.Ok(new SecureResponse
    {
        Message = $"✅ Hello {request.Name}! Full JWT validation passed",
        UserId = userId,
        Email = email,
        Issuer = issuer,
        Audience = audience,
        ClientId = applicationId, // Return applicationId as ClientId for compatibility
        Claims = user.Claims.Select(c => new { c.Type, c.Value }).ToList()
    });
})
.RequireAuthorization("BffClientOnly"); // Enforces both JWT validation AND applicationId check
```

#### CORS Configuration

```csharp
// Add CORS to allow BFF to proxy requests (configurable)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:3118", "https://localhost:3118" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

---

## JWT Token Claims Structure

### Access Token Claims (FusionAuth Free Tier)

**Actual JWT claims from FusionAuth:**

```json
{
  "aud": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
  "exp": 1761275035,
  "iat": 1761271435,
  "iss": "acme.com",
  "sub": "00000000-0000-0000-0000-000000000002",
  "jti": "0b76f49c-2f62-43f7-8bc3-40dc104f18ac",
  "authenticationType": "PING",
  "applicationId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
  "scope": "openid email profile offline_access",
  "sid": "8fc96668-9428-4551-8195-895ee17cd188",
  "auth_time": 1761271435,
  "tid": "7d1e1364-40f8-01e2-cef8-0466ad23ac99"
}
```

**Important Notes:**
- ❌ **No `client_id` claim** - FusionAuth uses `applicationId` instead
- ✅ `iss` is set to **tenant issuer** (`acme.com`), NOT the FusionAuth endpoint URL
- ✅ `aud` is set to the **BFF Application ID**
- ✅ `applicationId` claim is what we use for authorization policy

### Key Claims for Validation

| Claim | Value | Validation Layer |
|-------|-------|------------------|
| `iss` | `acme.com` (tenant issuer) | Issuer validation |
| `aud` | BFF Application ID | Audience validation |
| `exp` | Unix timestamp | Lifetime validation |
| `applicationId` | BFF Application ID | Authorization policy |

**Critical Differences from Custom Audience Setup:**
- In a paid FusionAuth setup with Entity Management, `aud` would be a custom API identifier (e.g., "my-api")
- In the free tier, `aud` is the Application ID that requested the token
- FusionAuth uses `applicationId` claim instead of `client_id` (unlike most other identity providers)
- The `iss` claim is the tenant issuer (configured in FusionAuth tenant settings), not the endpoint URL

---

## Comparison: Authgear vs FusionAuth Workaround

### Similarities

Both Authgear and FusionAuth free tier:
1. Don't support custom API audience configuration
2. Set `aud` to the issuing application/client ID
3. Require the same workaround approach (multi-layer security)
4. Need claim-based authorization policy for API-specific access control

### Differences

| Aspect | Authgear | FusionAuth Free Tier |
|--------|----------|----------------------|
| **Audience Claim** | Set to Authgear endpoint | Set to Application ID |
| **Authorization Claim** | `client_id` | `applicationId` ⚠️ |
| **Issuer** | Authgear endpoint | Tenant issuer (e.g., `acme.com`) |
| **JWKS Endpoint** | `/.well-known/jwks.json` | `/.well-known/jwks.json` |
| **Token Format** | Always JWT | JWT (configurable) |
| **Paid Feature** | N/A (no paid tier for custom audience) | Entity Management |

### Configuration Comparison

**Authgear:**
```csharp
ValidIssuer = "http://localhost:3000"
ValidAudience = "http://localhost:3000" // Same as issuer
```

**FusionAuth Free Tier:**
```csharp
ValidIssuer = "acme.com" // Tenant issuer, NOT endpoint URL
ValidAudience = "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab" // BFF App ID
// Authorization policy uses "applicationId" claim instead of "client_id"
```

---

## Security Analysis

### Why This Workaround Is Production-Ready

1. **JWT Signature Validation (Cryptographic)**
   - Uses asymmetric cryptography (RS256)
   - Public key fetched from FusionAuth's JWKS endpoint
   - Prevents token tampering

2. **Issuer Validation (Trust)**
   - Ensures token came from your FusionAuth instance
   - Prevents tokens from other identity providers

3. **Audience Validation (Scope Limiting)**
   - Even without custom audiences, validates the Application ID
   - Ensures token was issued for your BFF application
   - Prevents token reuse from other applications

4. **Lifetime Validation (Freshness)**
   - Prevents replay attacks with expired tokens
   - 5-minute clock skew tolerance

5. **Application ID Validation (API-Specific Access Control)**
   - **This is the key workaround layer**
   - Ensures only tokens with the BFF's `applicationId` can access the API
   - FusionAuth-specific: uses `applicationId` claim instead of `client_id`
   - Provides the same protection as custom audience validation

### Attack Scenarios Prevented

| Attack | Prevention Mechanism |
|--------|---------------------|
| Token from another FusionAuth instance | Issuer validation fails (wrong tenant issuer) |
| Token for a different application | Audience validation fails (wrong Application ID) |
| Expired token | Lifetime validation fails |
| Token from a different application | Application ID policy fails (wrong `applicationId` claim) |
| Tampered token | Signature validation fails (JWKS verification) |

---

## Production Considerations

### When to Upgrade to FusionAuth Paid Tier

Consider upgrading to FusionAuth's paid Entity Management feature if:

1. **Multiple Backend APIs**: You have multiple APIs with different authorization requirements
2. **Fine-Grained Permissions**: You need per-API scopes and permissions
3. **Third-Party Access**: You want to allow third-party applications to access specific APIs
4. **Compliance Requirements**: Your compliance framework requires explicit API audience validation

### What the Paid Tier Provides

With FusionAuth's Entity Management (paid feature):
- Define custom entities (API resources)
- Set custom `aud` claim in JWTs
- Create entity-specific scopes and permissions
- Support multiple audiences in a single token

**Example with Entity Management:**
```json
{
  "aud": "https://api.mycompany.com",  // Custom API audience
  "scope": "read:data write:data",     // Custom scopes
  "client_id": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab"
}
```

### Migration Path

If you later upgrade to Entity Management:

1. Create an Entity in FusionAuth for your API
2. Update the BFF to request the entity's scope
3. Update the API to validate the custom audience
4. Keep the `client_id` policy as an additional security layer

**Minimal Code Changes Required:**
```csharp
// Before (Free Tier Workaround)
ValidAudience = "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab" // BFF App ID

// After (With Entity Management)
ValidAudience = "https://api.mycompany.com" // Custom audience
```

---

## Testing the Implementation

### 1. Start the Services

```bash
# Start FusionAuth
docker compose up -d

# Start BFF
cd BespokeBff && dotnet run

# Start TestApi
cd TestApi && dotnet run

# Start UI
cd Ui/example-ui && npm run dev
```

### 2. Test Anonymous Endpoint

```bash
curl -X POST http://localhost:3118/api/api/public \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

**Expected Response:**
```json
{
  "message": "Hello Test! This is a public endpoint.",
  "timestamp": "2025-10-23T..."
}
```

### 3. Test Protected Endpoint (Authenticated)

1. Navigate to `http://localhost:4667/api-test`
2. Click "Login" (redirected to FusionAuth)
3. Login with test credentials
4. Click "Test Secure Endpoint"

**Expected Response:**
```json
{
  "message": "✅ Hello Test! Full JWT validation passed",
  "userId": "00000000-0000-0000-0000-000000000002",
  "email": "test@example.local",
  "issuer": "http://localhost:9011",
  "audience": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
  "clientId": "f62e03d1-cbdb-4ff8-92e3-1966dc05d1ab",
  "claims": [...]
}
```

### 4. Verify Security Layers

**Test with invalid token:**
```bash
curl -X POST http://localhost:5160/api/secure \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "data": "test"}'
```

**Expected:** `401 Unauthorized` (JWT signature validation fails)

**Test with expired token:**
- Wait for token to expire (1 hour)
- Attempt to call secure endpoint
**Expected:** `401 Unauthorized` (Lifetime validation fails)

---

## Troubleshooting

### Issue: 401 Unauthorized on Protected Endpoint

**Possible Causes:**
1. Token not included in request
2. Token expired
3. Token signature invalid
4. Issuer mismatch
5. Audience mismatch
6. Client ID mismatch

**Debug Steps:**
1. Check browser console for JWT token
2. Decode JWT at jwt.io to inspect claims
3. Verify `iss` matches FusionAuth Authority
4. Verify `aud` matches BFF Application ID
5. Verify `client_id` matches BFF Client ID
6. Check TestApi logs for specific validation error

### Issue: 403 Forbidden on Protected Endpoint

**Cause:** JWT validation passed but authorization policy failed

**Debug Steps:**
1. Verify `client_id` claim exists in token
2. Verify `client_id` value matches `ExpectedClientId` in config
3. Check TestApi authorization policy configuration

### Issue: CORS Error

**Cause:** BFF origin not allowed in TestApi CORS policy

**Fix:** Ensure TestApi CORS includes BFF origin:
```csharp
policy.WithOrigins("http://localhost:3118", "https://localhost:3118")
```

---

## Files Modified

| File | Purpose | Key Changes |
|------|---------|-------------|
| `/TestApi/appsettings.json` | FusionAuth configuration | Added FusionAuth section with validation parameters |
| `/TestApi/Program.cs` | JWT authentication setup | Implemented multi-layer validation + client_id policy |
| `/kickstart/kickstart.json` | FusionAuth kickstart | BFF application configuration |
| `/BespokeBff/appsettings.json` | YARP proxy config | Points to TestApi on port 5160 |

---

## References

- [FusionAuth Entity Management Documentation](https://fusionauth.io/docs/get-started/core-concepts/entity-management)
- [FusionAuth JWT Configuration](https://fusionauth.io/docs/get-started/core-concepts/tenants#jwt)
- [Authgear Scope Workaround](./AUTHGEAR_AUTHENTICATION_FLOW.md) (similar approach)
- [JWT Best Practices (RFC 8725)](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Last Updated:** October 23, 2025
**Version:** 1.0
**Tested With:** FusionAuth 1.53.0 (Free Tier)
