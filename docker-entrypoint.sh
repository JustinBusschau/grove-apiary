#!/bin/sh

# Ensure the prisma directory exists
mkdir -p /app/prisma

# Check if database exists, if not create a placeholder (Prisma will handle the rest)
if [ ! -f "/app/prisma/dev.db" ]; then
    echo "Database not found, will be created on first run..."
fi

echo "Starting Grove Apiary..."

# Start the application
exec "$@"
