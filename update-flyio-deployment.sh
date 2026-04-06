#!/bin/bash
# Update Fly.io Deployment with Timestamp Formatting Changes

echo "Creating deployment package with timestamp formatting updates..."

# Create temporary deployment directory
mkdir -p flyio-update
cd flyio-update

# Copy core application files
cp -r ../src ./
cp ../package.json ./
cp ../Dockerfile ./
cp ../.env ./ 2>/dev/null || echo "No .env file found"

# Create fly.toml for deployment
cat > fly.toml << 'EOF'
app = "resgrid2eso"
primary_region = "lax"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[env]
  NODE_ENV = "production"
EOF

echo "Deployment package created in flyio-update/"
echo ""
echo "To deploy the timestamp formatting updates to Fly.io:"
echo "1. Navigate to the flyio-update directory"
echo "2. Run: fly deploy --app resgrid2eso"
echo ""
echo "The updated system will show timestamps in 6/9/2025 1:49:43 format in Google Sheets"
echo "while maintaining ISO format for ESO XML compliance."