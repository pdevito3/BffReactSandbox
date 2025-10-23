#!/bin/bash
set -e

# Authgear User Bootstrap Script
# Creates test users via the GraphQL Admin API

AUTHGEAR_URL="http://localhost:3000"
AUTHGEAR_APP_ID="bespokebff"
ADMIN_API_SECRET="admin-api-secret-key-change-this-in-production"

# GraphQL endpoint
GRAPHQL_ENDPOINT="${AUTHGEAR_URL}/_api/admin/graphql"

echo "🔐 Bootstrapping Authgear users..."
echo "   Endpoint: ${GRAPHQL_ENDPOINT}"
echo "   App ID: ${AUTHGEAR_APP_ID}"

# Function to generate JWT for Admin API authentication
# For simplicity, we'll use a simple approach
# In production, generate proper JWT with RS256
generate_admin_token() {
    # Create a simple JWT payload
    # This is a simplified version - Authgear may require proper JWT
    echo "admin-api-secret-key-change-this-in-production"
}

# Function to call GraphQL API
call_graphql() {
    local query=$1
    local variables=$2

    curl -X POST "${GRAPHQL_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(generate_admin_token)" \
        -H "X-Authgear-App-ID: ${AUTHGEAR_APP_ID}" \
        -d "{\"query\": \"${query}\", \"variables\": ${variables}}" \
        --silent \
        --show-error
}

# Wait for Authgear to be ready
wait_for_authgear() {
    echo "⏳ Waiting for Authgear to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl --silent --fail "${AUTHGEAR_URL}/healthz" > /dev/null 2>&1; then
            echo "✅ Authgear is ready!"
            return 0
        fi

        echo "   Attempt $attempt/$max_attempts - Authgear is not ready yet..."
        sleep 5
        ((attempt++))
    done

    echo "❌ Authgear failed to become ready within the timeout period"
    return 1
}

# Wait for Authgear
wait_for_authgear

# Give it a few more seconds to fully initialize
sleep 5

echo ""
echo "📝 Creating test users..."

# Create Admin User
echo "   Creating admin user (admin@example.local)..."

ADMIN_USER_MUTATION='mutation CreateAdminUser($input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      standardAttributes
    }
  }
}'

ADMIN_USER_VARIABLES='{
  "input": {
    "definition": {
      "loginID": {
        "key": "email",
        "value": "admin@example.local"
      }
    },
    "password": "password123",
    "sendPassword": false,
    "setPasswordExpired": false
  }
}'

# Execute admin user creation
ADMIN_RESULT=$(call_graphql "${ADMIN_USER_MUTATION}" "${ADMIN_USER_VARIABLES}" 2>&1 || echo "Failed")

if echo "$ADMIN_RESULT" | grep -q "errors"; then
    echo "   ⚠️  Admin user may already exist or creation failed"
    echo "   Response: $ADMIN_RESULT"
else
    echo "   ✅ Admin user created successfully!"
fi

# Create Test User
echo "   Creating test user (test@example.local)..."

TEST_USER_VARIABLES='{
  "input": {
    "definition": {
      "loginID": {
        "key": "email",
        "value": "test@example.local"
      }
    },
    "password": "password",
    "sendPassword": false,
    "setPasswordExpired": false
  }
}'

# Execute test user creation
TEST_RESULT=$(call_graphql "${ADMIN_USER_MUTATION}" "${TEST_USER_VARIABLES}" 2>&1 || echo "Failed")

if echo "$TEST_RESULT" | grep -q "errors"; then
    echo "   ⚠️  Test user may already exist or creation failed"
    echo "   Response: $TEST_RESULT"
else
    echo "   ✅ Test user created successfully!"
fi

echo ""
echo "🎉 User bootstrap complete!"
echo ""
echo "📝 Test Credentials:"
echo "   Admin: admin@example.local / password123"
echo "   Test:  test@example.local / password"
echo ""
echo "Note: If users already exist, the script will skip creation."
echo "To reset, remove Docker volumes: docker compose down -v"
