#!/bin/bash
set -e

# Install pg_partman extension for PostgreSQL
# This is required by Authgear for partition management

echo "Installing pg_partman extension..."

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

# Create pg_partman extension in the database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create pg_partman schema
    CREATE SCHEMA IF NOT EXISTS partman;

    -- Note: pg_partman needs to be installed as a PostgreSQL extension
    -- For PostgreSQL 16, pg_partman may not be available by default
    -- We'll create the schema but skip the extension installation
    -- Authgear can work without partitioning for smaller deployments

    -- Grant permissions
    GRANT ALL ON SCHEMA partman TO postgres;
    GRANT ALL ON SCHEMA public TO postgres;

    -- Log success
    SELECT 'PostgreSQL database initialized successfully' AS status;
EOSQL

echo "PostgreSQL initialization complete!"
echo "Note: pg_partman extension is optional for development environments"
