#!/bin/sh
set -e

# Function to wait for a service
wait_for_service() {
    local service=$1
    local host=$2
    local port=$3
    local timeout=${4:-30}
    
    echo "Waiting for $service..."
    for i in $(seq 1 $timeout); do
        if nc -z "$host" "$port"; then
            echo "$service is available"
            return 0
        fi
        sleep 1
    done
    
    echo "Timeout waiting for $service"
    return 1
}

# Wait for required services
if [ -n "$DATABASE_URL" ]; then
    db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\(.*\):.*/\1/p')
    db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    wait_for_service "database" "$db_host" "$db_port"
fi

if [ -n "$REDIS_URL" ]; then
    redis_host=$(echo "$REDIS_URL" | sed -n 's/.*@\(.*\):.*/\1/p')
    redis_port=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')
    wait_for_service "redis" "$redis_host" "$redis_port"
fi

# Validate environment
echo "Validating environment..."
bun run scripts/deploy.ts --validate-env

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    bun prisma migrate deploy
fi

# Start application
echo "Starting application..."
exec "$@"