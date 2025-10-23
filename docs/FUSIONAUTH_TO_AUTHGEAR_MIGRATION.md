# Migration from FusionAuth to Authgear

This document summarizes the migration from FusionAuth to Authgear for the BespokeBFF project.

## Summary of Changes

### Architecture Changes

**Before (FusionAuth)**:
- FusionAuth (port 9011)
- PostgreSQL (port 5433)
- OpenSearch/Elasticsearch

**After (Authgear)**:
- Authgear (port 3000)
- PostgreSQL (port 5433)
- Redis (port 6379)
- No Elasticsearch required

### Configuration Changes

#### docker-compose.yml
- Replaced FusionAuth service with Authgear
- Replaced OpenSearch with Redis
- Configuration files mounted directly to `/app/`
- Database/Redis URLs passed via environment variables

#### Configuration Files

**FusionAuth**:
- `kickstart/kickstart.json` - Application and user bootstrap

**Authgear**:
- `authgear/authgear.yaml` - Main configuration (OAuth clients, verification settings)
- `authgear/authgear.secrets.yaml` - Cryptographic keys and secrets

#### BFF Application Settings

**appsettings.Development.json**:
```json
{
  "Authgear": {
    "Authority": "http://localhost:3000",
    "ClientId": "bff-client",
    "ClientSecret": "bff-secret-key-change-this-in-production",
    "Audience": "bff-client"
  }
}
```

Changed from:
- Authority: `http://localhost:9011` → `http://localhost:3000`
- Section name: `FusionAuth` → `Authgear`

**Program.cs**:
- Configuration section reference changed from `FusionAuth` to `Authgear`

### Environment Variables (.env)

**Before**:
```bash
FUSIONAUTH_APP_KICKSTART_FILE=/usr/local/fusionauth/kickstart/kickstart.json
FUSIONAUTH_APP_MEMORY=512M
FUSIONAUTH_APP_RUNTIME_MODE=development
FUSIONAUTH_SEARCH_TYPE=elasticsearch
OPENSEARCH_JAVA_OPTS="-Xms512m -Xmx512m"
```

**After**:
```bash
AUTHGEAR_APP_ID=bespokebff
AUTHGEAR_PUBLIC_ORIGIN=http://localhost:3000
```

### OIDC Endpoints

**FusionAuth**:
- Authorization: `http://localhost:9011/oauth2/authorize`
- Token: `http://localhost:9011/oauth2/token`
- Discovery: `http://localhost:9011/.well-known/openid-configuration`

**Authgear**:
- Authorization: `http://localhost:3000/oauth2/authorize`
- Token: `http://localhost:3000/oauth2/token`
- Discovery: `http://localhost:3000/.well-known/openid-configuration`

### User Management

**FusionAuth**:
- Users created via kickstart.json on first startup
- Admin UI at `http://localhost:9011/admin`

**Authgear**:
- Users created via GraphQL Admin API (script: `authgear/bootstrap-users.sh`)
- Admin Portal at `http://localhost:3002`
- Main UI for authentication at `http://localhost:3000`

### Setup Scripts

**Before**: `./setup-fusionauth.sh`
**After**: `./setup-authgear.sh`

Both scripts:
- Start Docker services
- Wait for health checks
- Run database migrations
- Bootstrap test users

## Key Differences

### 1. Configuration Approach

**FusionAuth**:
- Uses Kickstart JSON file for initial setup
- Configuration via Admin UI or API

**Authgear**:
- Uses YAML configuration files
- OAuth clients defined in `authgear.yaml`
- Secrets stored in `authgear.secrets.yaml`

### 2. Database Setup

**FusionAuth**:
- Automatic schema management via kickstart
- No manual migrations needed

**Authgear**:
- Requires explicit database migrations:
  ```bash
  docker compose run --rm authgear authgear database migrate up
  docker compose run --rm authgear authgear audit database migrate up
  docker compose run --rm authgear authgear images database migrate up
  ```

### 3. Secret Management

**FusionAuth**:
- Client secrets in kickstart.json or env vars

**Authgear**:
- Cryptographic keys in `authgear.secrets.yaml`
- Generated using JWK format (RS256, HS256)
- Includes separate keys for OAuth, CSRF, webhooks, admin API

### 4. Search Functionality

**FusionAuth**:
- Requires Elasticsearch/OpenSearch

**Authgear**:
- Optional search implementation
- Can use PostgreSQL or Elasticsearch
- Set to `none` for development

### 5. User Bootstrap

**FusionAuth**:
- Declarative in kickstart.json
- Users created on first startup

**Authgear**:
- Imperative via GraphQL Admin API
- Script-based user creation
- Idempotent (won't fail if users exist)

## Migration Steps

If you're migrating an existing deployment:

1. **Backup Data**:
   ```bash
   # Export FusionAuth users
   # Export application configurations
   ```

2. **Update Configuration**:
   ```bash
   # Update docker-compose.yml
   # Create authgear/authgear.yaml
   # Generate authgear/authgear.secrets.yaml
   # Update .env file
   ```

3. **Update Application Code**:
   ```bash
   # Update appsettings.json
   # Update Program.cs
   ```

4. **Start Authgear**:
   ```bash
   ./setup-authgear.sh
   ```

5. **Migrate Users**:
   ```bash
   # Use GraphQL Admin API to recreate users
   # Or modify bootstrap-users.sh script
   ```

6. **Test Authentication**:
   ```bash
   # Start BFF
   cd BespokeBff && dotnet run

   # Start UI
   cd Ui/example-ui && pnpm dev

   # Test login at http://localhost:4667
   ```

## Benefits of Authgear

1. **Simpler Architecture**: No Elasticsearch requirement for small deployments
2. **File-Based Configuration**: Easy to version control and review
3. **Better Development Experience**: DEV_MODE for rapid iteration
4. **GraphQL Admin API**: Modern API for user management
5. **Open Source**: Full source code available
6. **Active Development**: Regular updates and improvements

## Compatibility

Both IDPs support the same OIDC/OAuth2 standards, so the .NET BFF code requires minimal changes:
- ✅ Authorization Code Flow with PKCE
- ✅ Refresh Tokens
- ✅ JWT Access Tokens
- ✅ UserInfo endpoint
- ✅ Standard scopes (openid, email, profile, offline_access)

## Testing

After migration, verify:

1. **OIDC Discovery**: `curl http://localhost:3000/.well-known/openid-configuration`
2. **Health Check**: `curl http://localhost:3000/healthz`
3. **Login Flow**: Test complete authentication flow via UI
4. **Token Refresh**: Verify automatic token refresh works
5. **Logout**: Test logout clears session properly

## Troubleshooting

### Authgear Won't Start

Check logs:
```bash
docker compose logs authgear
```

Common issues:
- Invalid YAML syntax in `authgear.yaml`
- Missing keys in `authgear.secrets.yaml`
- Database connection issues

### Configuration Validation Errors

Use the init command to regenerate valid config:
```bash
docker run --rm -v "$PWD/temp:/work" quay.io/theauthgear/authgear-server authgear init -o /work
```

### Users Not Created

Check bootstrap script:
```bash
./authgear/bootstrap-users.sh
```

Note: The Admin API authentication requires proper JWT tokens. The script uses a simplified approach for development.

## References

- [Authgear Documentation](https://docs.authgear.com/)
- [Authgear GitHub](https://github.com/authgear/authgear-server)
- [OIDC Specification](https://openid.net/connect/)
- [IDP Configuration Requirements](./IDP_CONFIGURATION_REQUIREMENTS.md)

## Rollback Plan

If you need to rollback to FusionAuth:

1. Restore old docker-compose.yml from git
2. Restore old appsettings.json
3. Restore old .env file
4. Run `./setup-fusionauth.sh` (if you kept the file)
5. Restart services

Make sure to keep backups of your configuration before migrating.
