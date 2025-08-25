# CSRF Protection Implementation

This BFF (Backend for Frontend) implementation includes CSRF protection similar to Duende.BFF, using an X-CSRF header mechanism.

## How It Works

### 1. X-CSRF Header Requirement
- All authenticated POST/PUT/PATCH/DELETE requests to local API endpoints must include an `X-CSRF` header
- Default required value is `"1"` (configurable)
- This prevents cross-origin requests from making unauthorized calls

### 2. SameSite Cookie Protection  
- Authentication cookies use `SameSite = Lax` policy (configured in Program.cs:39)
- Provides first layer of CSRF defense at browser level

### 3. CORS Pre-flight Enforcement
- Custom X-CSRF header requirement triggers CORS pre-flight for cross-origin requests
- Combined with credentials (cookies), this prevents unauthorized cross-origin calls

## Protected Endpoints

The middleware automatically protects:
- All authenticated POST/PUT/PATCH/DELETE requests
- Local API endpoints (not reverse-proxied routes)

### Excluded Paths
The following paths are excluded from CSRF validation:
- `/bff/login`
- `/bff/logout` 
- `/signin-oidc`
- `/signout-callback-oidc`
- `/signout-oidc`
- `/health`

## Usage Examples

### Valid Request (with CSRF header)
```bash
curl -X POST https://localhost:7071/bff/test \
  -H "X-CSRF: 1" \
  -H "Cookie: __MyAppBFF=your-session-cookie" \
  -H "Content-Type: application/json"
```

### Invalid Request (missing CSRF header)
```bash
curl -X POST https://localhost:7071/bff/test \
  -H "Cookie: __MyAppBFF=your-session-cookie" \
  -H "Content-Type: application/json"
```
Returns: `400 Bad Request - Missing or invalid anti-forgery token.`

## Frontend Integration

Frontend applications should include the X-CSRF header in all state-changing requests:

```javascript
// Example with fetch
fetch('/bff/refresh', {
  method: 'POST',
  headers: {
    'X-CSRF': '1',
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});

// Example with axios
axios.defaults.headers.common['X-CSRF'] = '1';
```

## Configuration

CSRF protection can be customized in Program.cs:

```csharp
builder.Services.AddCsrfProtection(options =>
{
    options.HeaderName = "X-CSRF";           // Custom header name
    options.RequiredHeaderValue = "1";       // Required header value
    options.ExcludedPaths.Add("/custom");    // Additional excluded paths
});
```

## Security Benefits

1. **Cross-Origin Request Protection**: Prevents malicious sites from making authenticated requests
2. **CORS Pre-flight Enforcement**: Custom headers trigger CORS checks for cross-origin requests  
3. **Defense in Depth**: Combines SameSite cookies with header-based validation
4. **BFF Pattern Security**: Protects the BFF's local API endpoints while allowing reverse proxy routes