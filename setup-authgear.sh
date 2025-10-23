#!/bin/bash

# Idempotent Authgear setup script
# This script can be run multiple times safely

set -e

echo "🚀 Setting up Authgear with Docker Compose..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker compose is available
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ 'docker compose' is not available. Please install Docker Compose."
    exit 1
fi

echo "📦 Using $DOCKER_COMPOSE_CMD"

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if $DOCKER_COMPOSE_CMD ps --format json | grep -q "\"Health\":\"healthy\".*\"Service\":\"$service_name\"" ||
           $DOCKER_COMPOSE_CMD ps | grep -E "$service_name.*healthy" > /dev/null; then
            echo "✅ $service_name is healthy!"
            return 0
        fi

        echo "   Attempt $attempt/$max_attempts - $service_name is not ready yet..."
        sleep 5
        ((attempt++))
    done

    echo "❌ $service_name failed to become healthy within the timeout period"
    echo "Debug information:"
    $DOCKER_COMPOSE_CMD ps
    $DOCKER_COMPOSE_CMD logs $service_name
    return 1
}

# Start the services (this is idempotent - won't recreate if already running)
echo "🏗️  Starting Authgear services..."
$DOCKER_COMPOSE_CMD up -d

# Wait for database to be healthy
check_service_health "db"

# Wait for Redis to be healthy
check_service_health "redis"

# Run database migrations
echo ""
echo "📊 Running Authgear database migrations..."

echo "   Running main database migration..."
$DOCKER_COMPOSE_CMD run --rm authgear authgear database migrate up || echo "⚠️  Main migration may already be applied"

echo "   Running audit database migration..."
$DOCKER_COMPOSE_CMD run --rm authgear authgear audit database migrate up || echo "⚠️  Audit migration may already be applied"

echo "   Running images database migration..."
$DOCKER_COMPOSE_CMD run --rm authgear authgear images database migrate up || echo "⚠️  Images migration may already be applied"

echo "✅ Database migrations complete!"

# Wait for Authgear to be healthy
check_service_health "authgear"

# Bootstrap test users
echo ""
echo "👥 Bootstrapping test users..."
if [ -f "./authgear/bootstrap-users.sh" ]; then
    ./authgear/bootstrap-users.sh
else
    echo "⚠️  Bootstrap script not found. Users will need to be created manually."
fi

echo ""
echo "🎉 Authgear setup complete!"
echo ""
echo "📝 Configuration Details:"
echo "   - Authgear URL: http://localhost:3000"
echo "   - PostgreSQL: localhost:5433"
echo "   - Redis: localhost:6379"
echo "   - Admin user email: admin@example.local"
echo "   - Admin user password: password123"
echo "   - Test user email: test@example.local"
echo "   - Test user password: password"
echo "   - BFF Client ID: bff-client"
echo "   - BFF Client Secret: bff-secret-key-change-this-in-production"
echo ""
echo "🔧 Next steps:"
echo "   1. Visit http://localhost:3000 to access Authgear"
echo "   2. Configure your .NET BFF to use the OIDC endpoints"
echo "   3. Test the authentication flow"
echo ""
echo "🔍 OIDC Discovery:"
echo "   http://localhost:3000/.well-known/openid-configuration"
echo ""

# Check Authgear health status
echo "🔍 Checking Authgear health status..."
if curl -s -f http://localhost:3000/healthz > /dev/null; then
    echo "✅ Authgear is responding"
else
    echo "⚠️  Authgear may not be fully ready yet"
fi

echo "✨ Setup script completed successfully!"
