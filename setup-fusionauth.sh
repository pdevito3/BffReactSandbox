#!/bin/bash

# Idempotent FusionAuth setup script
# This script can be run multiple times safely

set -e

echo "🚀 Setting up FusionAuth with Docker Compose..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Neither 'docker-compose' nor 'docker compose' is available. Please install Docker Compose."
    exit 1
fi

echo "📦 Using $DOCKER_COMPOSE_CMD"

# Start the services (this is idempotent - won't recreate if already running)
echo "🏗️ Starting FusionAuth services..."
$DOCKER_COMPOSE_CMD up -d

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

# Wait for database to be healthy
check_service_health "db"

# Wait for search to be healthy
check_service_health "search"

# Wait for FusionAuth to be healthy
check_service_health "fusionauth"

echo ""
echo "🎉 FusionAuth setup complete!"
echo ""
echo "📝 Configuration Details:"
echo "   - FusionAuth Admin UI: http://localhost:9011"
echo "   - PostgreSQL: localhost:5432"
echo "   - Default admin email: admin@example.local"
echo "   - Default admin password: password123"
echo "   - Test user email: test@example.local"
echo "   - Test user password: password"
echo "   - BFF Client ID: 3c219e58-ed0e-4b18-ad48-f4f92793ae32"
echo "   - BFF Client Secret: super-secret-client-secret"
echo ""
echo "🔧 Next steps:"
echo "   1. Visit http://localhost:9011 to access FusionAuth admin"
echo "   2. Configure your .NET BFF to use the OIDC endpoints"
echo "   3. Test the authentication flow"
echo ""

# Check FusionAuth API status
echo "🔍 Checking FusionAuth API status..."
if curl -s -f http://localhost:9011/api/status > /dev/null; then
    echo "✅ FusionAuth API is responding"
else
    echo "⚠️  FusionAuth API may not be fully ready yet"
fi

echo "✨ Setup script completed successfully!"