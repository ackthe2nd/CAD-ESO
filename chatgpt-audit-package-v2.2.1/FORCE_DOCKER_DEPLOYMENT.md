# Force Docker Deployment - Bypass Buildpack Cache

## The Problem
Fly.io is cached to use buildpacks despite the Dockerfile configuration. This requires forcing Docker deployment explicitly.

## Solution Commands

Run these commands in your PowerShell from the project directory:

### Option 1: Force Docker Strategy
```powershell
flyctl deploy --app resgrid2eso --strategy docker
```

### Option 2: Force with Dockerfile Specification
```powershell
flyctl deploy --app resgrid2eso --dockerfile Dockerfile --strategy docker
```

### Option 3: Clear Cache and Deploy
```powershell
flyctl deploy --app resgrid2eso --no-cache --strategy docker
```

### Option 4: Full Reset Deployment
```powershell
flyctl deploy --app resgrid2eso --dockerfile Dockerfile --no-cache --strategy docker --build-arg NODE_ENV=production
```

## Verification Steps
After successful deployment:

1. Check status:
```powershell
flyctl status --app resgrid2eso
```

2. Monitor logs:
```powershell
flyctl logs --app resgrid2eso
```

3. Verify emergency call processing:
```powershell
flyctl logs --app resgrid2eso | findstr "XML Upload Successful"
```

This forces Fly.io to use Docker and bypass the buildpack sunset error completely.