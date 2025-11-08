#!/bin/bash

# Script to start the Repair Assistant application with Docker
# This script handles the complete setup and startup

set -e

echo "🚀 Starting Repair Assistant with Docker..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update .env file with your configuration before continuing"
        echo ""
        read -p "Press Enter to continue after updating .env, or Ctrl+C to exit..."
    else
        echo "❌ .env.example file not found. Please create a .env file manually."
        exit 1
    fi
fi

# Generate NEXTAUTH_SECRET if not set or is default
if grep -q "NEXTAUTH_SECRET=your-secret-key-change-in-production" .env || grep -q "NEXTAUTH_SECRET=change-this-secret-in-production" .env; then
    echo "🔐 Generating secure NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32 | tr -d '\n')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env
    else
        # Linux
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env
    fi
    echo "✅ Generated and set NEXTAUTH_SECRET"
fi

echo "📦 Building and starting containers..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Repair Assistant is starting up!"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    # Read APP_PORT from .env if it exists
    if [ -f .env ]; then
        APP_PORT=$(grep "^APP_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3001")
    else
        APP_PORT=${APP_PORT:-3001}
    fi
    
    echo "🌐 Application will be available at:"
    echo "   http://localhost:${APP_PORT}"
    echo ""
    echo "📝 To view logs:"
    echo "   docker-compose logs -f app"
    echo ""
    echo "📝 To view database logs:"
    echo "   docker-compose logs -f postgres"
    echo ""
    echo "🛑 To stop the application:"
    echo "   docker-compose down"
    echo ""
    echo "🗑️  To stop and remove all data:"
    echo "   docker-compose down -v"
    echo ""
    echo "👤 To create an admin user after the app starts:"
    echo "   docker-compose run --rm scripts sh -c 'npm ci && npm install -g tsx && tsx scripts/create-user.ts admin@example.com password123 \"Admin User\"'"
    echo ""
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi

