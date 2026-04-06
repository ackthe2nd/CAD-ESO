#!/bin/bash
# Deployment script for Resgrid-ESO Bridge v2.1.4

echo "🚀 Deploying Resgrid-ESO Bridge v2.1.4..."

# Check if required files exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy .env.resgrid-bridge to .env and configure."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Validate environment
echo "🔍 Validating environment..."
node -e "
const { validateEnvironment } = require('./src/environment-validator');
try {
  validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}
"

# Start the service
echo "🎯 Starting Resgrid-ESO Bridge service..."
npm start
