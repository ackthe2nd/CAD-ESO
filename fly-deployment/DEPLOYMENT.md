# Deploying Resgrid to Fly.io

This document outlines the steps to deploy the Resgrid application to Fly.io.

## Prerequisites

1. [Install the Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Sign up for Fly.io and authenticate using `flyctl auth login`
3. Have a PostgreSQL or SQL Server database ready for use

## Configuration Files

The following files are required for deployment:

- `Dockerfile` - Defines how to build the application
- `fly.toml` - Configuration for Fly.io deployment
- `.dockerignore` - Excludes unnecessary files from the Docker build
- `.env` - Environment variables for configuration (created from `.env.example`)

## Deployment Steps

1. **Create your `.env` file**

   Copy the `.env.example` file and fill in your actual values:
   ```bash
   cp .env.example .env
   ```

2. **Set Fly.io secrets**

   Use the following commands to set up your environment secrets:
   ```bash
   flyctl secrets set ConnectionStrings__ResgridContext="your-connection-string"
   flyctl secrets set MappingConfig__GoogleMapsApiKey="your-google-maps-key"
   # Add other secrets as needed
   ```

3. **Deploy the application**

   ```bash
   flyctl deploy
   ```

4. **Monitor the deployment**

   ```bash
   flyctl status
   flyctl logs
   ```

## Issues and Fixes

### Missing Map API Keys

If maps aren't loading, make sure all required API keys are set:

```bash
flyctl secrets set MappingConfig__GoogleMapsApiKey="your-google-maps-key"
flyctl secrets set MappingConfig__GoogleMapsJSKey="your-google-maps-js-key"
flyctl secrets set MappingConfig__BingMapsApiKey="your-bing-maps-key"
```

### Notification Suppression Not Saving

This issue may be related to database permissions or error handling. Check the logs:

```bash
flyctl logs
```

Look for errors related to the UserProfileService or notification settings.

## Scaling

To scale the application for more traffic:

```bash
flyctl scale count 2  # Run 2 instances
flyctl scale vm shared-cpu-1x  # Change VM size
```

## Backup and Recovery

Always ensure your database has regular backups. Fly.io apps are stateless, so only your database needs backing up.

## Support

If you encounter any issues, check the Fly.io documentation or contact support:
- [Fly.io Docs](https://fly.io/docs/)
- [Fly.io Support](https://community.fly.io/)