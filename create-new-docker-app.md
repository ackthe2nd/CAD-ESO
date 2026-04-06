# Create New Docker App Solution

## Problem
The existing app is locked to buildpacks in Fly.io's cache. Creating a fresh app with Docker will bypass this issue.

## Solution Commands

### 1. Create new app with Docker
```powershell
flyctl apps create resgrid2eso-docker --org personal
```

### 2. Update fly.toml for new app
Replace your fly.toml content with:
```toml
app = "resgrid2eso-docker"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

[[http_service.checks]]
  interval = "30s"
  grace_period = "10s"
  method = "get"
  path = "/health"
  protocol = "http"
  timeout = "5s"
```

### 3. Copy secrets from old app
```powershell
flyctl secrets list --app resgrid2eso
```

Then set each secret for the new app:
```powershell
flyctl secrets set RESGRID_USER="your_value" --app resgrid2eso-docker
flyctl secrets set RESGRID_PASS="your_value" --app resgrid2eso-docker
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON="your_value" --app resgrid2eso-docker
flyctl secrets set LOG_SHEET_ID="your_value" --app resgrid2eso-docker
flyctl secrets set SFTP_HOST="sftp.esosuite.net" --app resgrid2eso-docker
flyctl secrets set SFTP_USER="CA-EMS" --app resgrid2eso-docker
flyctl secrets set SFTP_PASS="your_eso_password" --app resgrid2eso-docker
flyctl secrets set SFTP_DIR="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9" --app resgrid2eso-docker
```

### 4. Deploy new app
```powershell
flyctl deploy --app resgrid2eso-docker
```

### 5. Delete old app (after confirming new one works)
```powershell
flyctl apps destroy resgrid2eso
```

This creates a fresh Docker-based app without buildpack cache issues.