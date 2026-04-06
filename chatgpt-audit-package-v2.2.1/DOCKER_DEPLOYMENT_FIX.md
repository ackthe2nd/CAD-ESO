# Docker Deployment Fix for Fly.io

## Problem
The deployment fails with "heroku/buildpacks:20 has been sunset" because your local `fly.toml` doesn't specify Docker deployment.

## Solution Steps

### 1. Update your local fly.toml file
Replace your current `fly.toml` with this content:

```toml
# Fly.io Configuration for Resgrid-ESO Bridge - Dedicated Emergency Services
app = "resgrid2eso"
primary_region = "ord"

[experimental]
  auto_rollback = true

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  FLY_APP_NAME = "resgrid2eso"

# Dedicated machine configuration for emergency services reliability
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false

# VM configuration - small but dedicated for cost efficiency
[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

# Health check for emergency services uptime
[[http_service.checks]]
  interval = "30s"
  grace_period = "10s"
  method = "get"
  path = "/health"
  protocol = "http"
  timeout = "5s"
  tls_skip_verify = false

[deploy]
  release_command = "echo 'Emergency services deployment complete'"
```

### 2. Create Dockerfile in your project directory
Create a new file called `Dockerfile` (no extension) with this content:

```dockerfile
# Dockerfile for Resgrid ESO Bridge - Emergency Services Application
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs temp

# Expose port
EXPOSE 8080

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["node", "src/index.js"]
```

### 3. Deploy with Docker
```bash
flyctl deploy --app resgrid2eso
```

### 4. Set your ESO SFTP credentials
```bash
flyctl secrets set SFTP_PASS="your_eso_password" --app resgrid2eso
```

### 5. Monitor successful deployment
```bash
flyctl logs --app resgrid2eso
flyctl status --app resgrid2eso
```

This Docker deployment will resolve the buildpack sunset error and deploy your emergency services application with the SFTP handshake fix.