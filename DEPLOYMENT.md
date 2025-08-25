# Deployment Guide

This guide covers deploying the FusionAuth + .NET BFF authentication system to various environments.

## Production Deployment Checklist

### 🔒 Security
- [ ] **HTTPS Everywhere**: All services use HTTPS with valid certificates
- [ ] **Secure Cookies**: Set `Secure=true`, `HttpOnly=true`, `SameSite=Strict`
- [ ] **CORS Configuration**: Restrict to production domains only
- [ ] **Client Secrets**: Use strong, unique secrets stored securely
- [ ] **Certificate Validation**: Enable `RequireHttpsMetadata=true`
- [ ] **Environment Variables**: No secrets in configuration files

### 🛠 Configuration
- [ ] **Connection Strings**: Use production database connections
- [ ] **Logging**: Configure structured logging with appropriate levels
- [ ] **Session Settings**: Set production-appropriate timeouts
- [ ] **Rate Limiting**: Implement API rate limiting
- [ ] **Health Checks**: Configure comprehensive health endpoints

### 🚀 Infrastructure
- [ ] **Load Balancing**: Configure session affinity if needed
- [ ] **Database**: Set up production PostgreSQL with backups
- [ ] **Monitoring**: Set up application and infrastructure monitoring
- [ ] **Alerting**: Configure alerts for critical failures
- [ ] **Backups**: Implement regular backup strategies

## Environment Configuration

### Development
```bash
# .env (development)
FUSIONAUTH_AUTHORITY=http://localhost:9011
FUSIONAUTH_CLIENT_ID=fd123988-b649-4c44-afff-987ef6bd66a6
FUSIONAUTH_CLIENT_SECRET=super-secret-client-secret-new
FRONTEND_URL=http://localhost:4667
ASPNETCORE_ENVIRONMENT=Development
```

### Staging
```bash
# .env (staging)
FUSIONAUTH_AUTHORITY=https://auth-staging.yourdomain.com
FUSIONAUTH_CLIENT_ID=staging-client-id
FUSIONAUTH_CLIENT_SECRET=secure-staging-secret
FRONTEND_URL=https://app-staging.yourdomain.com
ASPNETCORE_ENVIRONMENT=Staging
```

### Production
```bash
# .env (production)
FUSIONAUTH_AUTHORITY=https://auth.yourdomain.com
FUSIONAUTH_CLIENT_ID=prod-client-id
FUSIONAUTH_CLIENT_SECRET=secure-production-secret
FRONTEND_URL=https://app.yourdomain.com
ASPNETCORE_ENVIRONMENT=Production
```

## Docker Deployment

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL for FusionAuth
  fusionauth-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fusionauth
      POSTGRES_USER: fusionauth
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - fusionauth_db:/var/lib/postgresql/data
    networks:
      - fusionauth_network
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # FusionAuth Identity Provider
  fusionauth:
    image: fusionauth/fusionauth-app:latest
    depends_on:
      - fusionauth-db
    environment:
      DATABASE_URL: jdbc:postgresql://fusionauth-db:5432/fusionauth
      DATABASE_ROOT_USERNAME: fusionauth
      DATABASE_ROOT_PASSWORD_FILE: /run/secrets/db_password
      FUSIONAUTH_APP_MEMORY: 1G
      FUSIONAUTH_APP_RUNTIME_MODE: production
    secrets:
      - db_password
    volumes:
      - fusionauth_config:/usr/local/fusionauth/config
    networks:
      - fusionauth_network
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fusionauth.rule=Host(`auth.yourdomain.com`)"
      - "traefik.http.routers.fusionauth.tls=true"
      - "traefik.http.routers.fusionauth.tls.certresolver=letsencrypt"

  # .NET BFF
  bff:
    build:
      context: ./BespokeBff
      dockerfile: Dockerfile.production
    environment:
      FUSIONAUTH__AUTHORITY: https://auth.yourdomain.com
      FUSIONAUTH__CLIENT_ID_FILE: /run/secrets/fusionauth_client_id
      FUSIONAUTH__CLIENT_SECRET_FILE: /run/secrets/fusionauth_client_secret
      FRONTEND_URL: https://app.yourdomain.com
      ASPNETCORE_ENVIRONMENT: Production
    secrets:
      - fusionauth_client_id
      - fusionauth_client_secret
    networks:
      - fusionauth_network
      - app_network
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bff.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.bff.tls=true"
      - "traefik.http.routers.bff.tls.certresolver=letsencrypt"

  # React Frontend
  frontend:
    build:
      context: ./example-ui
      dockerfile: Dockerfile.production
    environment:
      VITE_BFF_BASE_URL: https://api.yourdomain.com
    networks:
      - app_network
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"

secrets:
  db_password:
    external: true
  fusionauth_client_id:
    external: true
  fusionauth_client_secret:
    external: true

volumes:
  fusionauth_db:
  fusionauth_config:

networks:
  fusionauth_network:
    internal: true
  app_network:
    external: true
```

### Production Dockerfile (.NET BFF)

```dockerfile
# Dockerfile.production
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["BespokeBff.csproj", "./"]
RUN dotnet restore "BespokeBff.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "BespokeBff.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BespokeBff.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create non-root user
RUN addgroup --group fusionauth-bff && \
    adduser --system --group fusionauth-bff
USER fusionauth-bff

ENTRYPOINT ["dotnet", "BespokeBff.dll"]
```

### Production Dockerfile (React Frontend)

```dockerfile
# Dockerfile.production
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fusionauth-system

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fusionauth-config
  namespace: fusionauth-system
data:
  FUSIONAUTH_AUTHORITY: "https://auth.yourdomain.com"
  FRONTEND_URL: "https://app.yourdomain.com"
  ASPNETCORE_ENVIRONMENT: "Production"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: fusionauth-secrets
  namespace: fusionauth-system
type: Opaque
data:
  # Base64 encoded values
  db-password: <base64-encoded-password>
  fusionauth-client-id: <base64-encoded-client-id>
  fusionauth-client-secret: <base64-encoded-client-secret>
```

### PostgreSQL Deployment

```yaml
# k8s/postgresql.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: fusionauth-db
  namespace: fusionauth-system
spec:
  serviceName: fusionauth-db
  replicas: 1
  selector:
    matchLabels:
      app: fusionauth-db
  template:
    metadata:
      labels:
        app: fusionauth-db
    spec:
      containers:
      - name: postgresql
        image: postgres:16-alpine
        env:
        - name: POSTGRES_DB
          value: fusionauth
        - name: POSTGRES_USER
          value: fusionauth
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: fusionauth-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi

---
apiVersion: v1
kind: Service
metadata:
  name: fusionauth-db
  namespace: fusionauth-system
spec:
  selector:
    app: fusionauth-db
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

### FusionAuth Deployment

```yaml
# k8s/fusionauth.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fusionauth
  namespace: fusionauth-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fusionauth
  template:
    metadata:
      labels:
        app: fusionauth
    spec:
      containers:
      - name: fusionauth
        image: fusionauth/fusionauth-app:latest
        env:
        - name: DATABASE_URL
          value: "jdbc:postgresql://fusionauth-db:5432/fusionauth"
        - name: DATABASE_ROOT_USERNAME
          value: fusionauth
        - name: DATABASE_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: fusionauth-secrets
              key: db-password
        - name: FUSIONAUTH_APP_MEMORY
          value: "1G"
        - name: FUSIONAUTH_APP_RUNTIME_MODE
          value: "production"
        ports:
        - containerPort: 9011
        livenessProbe:
          httpGet:
            path: /api/status
            port: 9011
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/status
            port: 9011
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: fusionauth
  namespace: fusionauth-system
spec:
  selector:
    app: fusionauth
  ports:
  - port: 9011
    targetPort: 9011
```

### .NET BFF Deployment

```yaml
# k8s/bff.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bff
  namespace: fusionauth-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bff
  template:
    metadata:
      labels:
        app: bff
    spec:
      containers:
      - name: bff
        image: your-registry/bff:latest
        envFrom:
        - configMapRef:
            name: fusionauth-config
        env:
        - name: FUSIONAUTH__CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: fusionauth-secrets
              key: fusionauth-client-id
        - name: FUSIONAUTH__CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: fusionauth-secrets
              key: fusionauth-client-secret
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: bff
  namespace: fusionauth-system
spec:
  selector:
    app: bff
  ports:
  - port: 80
    targetPort: 80
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fusionauth-ingress
  namespace: fusionauth-system
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - auth.yourdomain.com
    - api.yourdomain.com
    secretName: fusionauth-tls
  rules:
  - host: auth.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: fusionauth
            port:
              number: 9011
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bff
            port:
              number: 80
```

## Cloud Provider Specific

### AWS ECS

```yaml
# aws/task-definition.json
{
  "family": "fusionauth-bff",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "bff",
      "image": "your-account.dkr.ecr.region.amazonaws.com/bff:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ASPNETCORE_ENVIRONMENT",
          "value": "Production"
        }
      ],
      "secrets": [
        {
          "name": "FUSIONAUTH__CLIENT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:fusionauth-client-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fusionauth-bff",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Azure Container Apps

```yaml
# azure/container-app.yaml
apiVersion: 2022-03-01
type: Microsoft.App/containerApps
properties:
  managedEnvironmentId: /subscriptions/.../resourceGroups/.../providers/Microsoft.App/managedEnvironments/env
  configuration:
    ingress:
      external: true
      targetPort: 80
    secrets:
    - name: fusionauth-client-secret
      value: "your-secret-value"
  template:
    containers:
    - name: bff
      image: your-registry.azurecr.io/bff:latest
      env:
      - name: ASPNETCORE_ENVIRONMENT
        value: Production
      - name: FUSIONAUTH__CLIENT_SECRET
        secretRef: fusionauth-client-secret
      resources:
        cpu: 1.0
        memory: 2Gi
    scale:
      minReplicas: 2
      maxReplicas: 10
```

## Monitoring and Logging

### Application Insights (.NET)

```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry();

// Add custom telemetry
builder.Services.AddSingleton<ITelemetryInitializer, AuthenticationTelemetryInitializer>();
```

### Structured Logging

```csharp
// Program.cs
builder.Services.AddSerilog((services, lc) => lc
    .ReadFrom.Configuration(builder.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.ApplicationInsights(services.GetService<TelemetryConfiguration>(), 
        TelemetryConverter.Traces));
```

### Health Checks

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddCheck<FusionAuthHealthCheck>("fusionauth")
    .AddCheck<DatabaseHealthCheck>("database");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");
app.MapHealthChecks("/health/live");
```

## Security Hardening

### Production appsettings.json

```json
{
  "Serilog": {
    "MinimumLevel": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Warning",
      "System": "Warning"
    }
  },
  "AllowedHosts": "yourdomain.com",
  "ForwardedHeaders": {
    "ForwardedProtoHeaderName": "X-Forwarded-Proto",
    "OriginalHostHeaderName": "X-Original-Host"
  }
}
```

### Secure Headers

```csharp
// Program.cs
app.Use((context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
    return next();
});
```

## Deployment Scripts

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e

ENV=${1:-staging}
VERSION=${2:-latest}

echo "Deploying to $ENV with version $VERSION"

# Build and push images
docker build -t your-registry/bff:$VERSION ./BespokeBff
docker build -t your-registry/frontend:$VERSION ./example-ui

docker push your-registry/bff:$VERSION
docker push your-registry/frontend:$VERSION

# Update Kubernetes manifests
kubectl set image deployment/bff bff=your-registry/bff:$VERSION -n fusionauth-system
kubectl set image deployment/frontend frontend=your-registry/frontend:$VERSION -n fusionauth-system

# Wait for rollout
kubectl rollout status deployment/bff -n fusionauth-system
kubectl rollout status deployment/frontend -n fusionauth-system

echo "Deployment completed successfully"
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

ENDPOINTS=(
  "https://auth.yourdomain.com/api/status"
  "https://api.yourdomain.com/health"
  "https://app.yourdomain.com"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Checking $endpoint..."
  if curl -f -s "$endpoint" > /dev/null; then
    echo "✅ $endpoint is healthy"
  else
    echo "❌ $endpoint is down"
    exit 1
  fi
done

echo "All services are healthy"
```

This deployment guide provides comprehensive instructions for deploying the FusionAuth authentication system to production environments with proper security, monitoring, and scalability considerations.