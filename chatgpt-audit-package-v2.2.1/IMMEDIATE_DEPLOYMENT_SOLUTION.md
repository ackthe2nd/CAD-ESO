# Immediate Deployment Solution

The error suggests using an environment variable to bypass the sunset check. Try this exact command:

## PowerShell Command
```powershell
flyctl deploy --app resgrid2eso --build-arg ALLOW_EOL_SHIMMED_BUILDER=1
```

If that doesn't work, try setting the environment variable first:
```powershell
$env:ALLOW_EOL_SHIMMED_BUILDER = "1"
flyctl deploy --app resgrid2eso
```

This bypasses the buildpack sunset error temporarily and allows your emergency services application to deploy successfully.

After deployment, monitor with:
```powershell
flyctl logs --app resgrid2eso
flyctl status --app resgrid2eso
```