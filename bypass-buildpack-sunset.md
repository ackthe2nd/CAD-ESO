# Temporary Buildpack Bypass Solution

The error message suggests using an environment variable to bypass the sunset check temporarily. This allows deployment while Fly.io resolves the Docker configuration issue.

## Commands to Execute

Run this command in PowerShell to set the bypass variable and deploy:

```powershell
$env:ALLOW_EOL_SHIMMED_BUILDER = "1"
flyctl deploy --app resgrid2eso
```

Alternative single command:
```powershell
flyctl deploy --app resgrid2eso --build-arg ALLOW_EOL_SHIMMED_BUILDER=1
```

This temporarily bypasses the buildpack sunset error and allows your emergency services application to deploy with the existing SFTP handshake fixes.