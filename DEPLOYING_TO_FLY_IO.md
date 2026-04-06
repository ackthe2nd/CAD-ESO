# Deploying to Fly.io

This guide provides step-by-step instructions for deploying the Resgrid-ESO Bridge to Fly.io, including the Google Sheets integration.

## Prerequisites

1. **Fly.io Account**: [Sign up at fly.io](https://fly.io/app/sign-up)
2. **Fly.io CLI**: [Install flyctl](https://fly.io/docs/hands-on/install-flyctl/)
3. **Google Service Account**: Set up as described in [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md)
4. **Google Sheet ID**: The ID of your Google Sheet for logging

## Setup

### 1. Login to Fly.io

```bash
flyctl auth login
```

### 2. Initialize Fly.io App (Skip if already initialized)

```bash
# In the project directory
flyctl launch --no-deploy
```

This will create a `fly.toml` file (which is already included in this project).

### 3. Set Required Secrets

Set all required secrets for your application:

```bash
# Resgrid credentials
flyctl secrets set RESGRID_USER=your_resgrid_username
flyctl secrets set RESGRID_PASS=your_resgrid_password

# SFTP connection info
flyctl secrets set SFTP_HOST=sftp.esosuite.net
flyctl secrets set SFTP_USERNAME=your_sftp_username
flyctl secrets set SFTP_PASSWORD=your_sftp_password
flyctl secrets set SFTP_REMOTE_PATH=/incoming

# Google Sheets integration
flyctl secrets set LOG_SHEET_ID=your_google_sheet_id
```

### 4. Set Google Service Account JSON

Since the Google service account credentials are a complex JSON object, we'll save it to a file and then set it as a secret:

```bash
# Option 1: If you have the JSON file
flyctl secrets import --from service-account.json

# Option 2: If you have the JSON as base64
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=your_base64_encoded_json

# Option 3: Set the raw JSON (less recommended due to potential escaping issues)
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

### 5. Deploy the Application

```bash
flyctl deploy
```

This will:
1. Build the Docker image using your Dockerfile
2. Push it to the Fly.io registry
3. Deploy the application using the configuration in `fly.toml`

### 6. Verify Deployment

Check the deployment logs:

```bash
flyctl logs
```

You should see messages indicating:
- The application started successfully
- Connected to the Resgrid SignalR hub
- "Service started successfully"
- "Google Sheets logging initialized successfully"

### 7. Test the Google Sheets Integration

After deployment, you can test the Google Sheets integration by running:

```bash
# Connect to the deployed app
flyctl ssh console

# Execute export script
node export-calls-to-sheets-enhanced.js --active
```

This will export all active calls to your Google Sheet, including XML data in column D.

## Troubleshooting

### Error: "Google Sheets logging is disabled - missing environment variables"

- Verify that the LOG_SHEET_ID secret is set correctly
- Check that the GOOGLE_SERVICE_ACCOUNT_JSON secret is properly set and formatted

### Error: "Failed to authorize Google client"

- Ensure your service account has access to the Google Sheet
- Verify the Google service account JSON contains valid client_email and private_key fields

### Error: "Unable to parse range: Sheet1!A1:W1"

- This is fixed in v1.4.3 by using 'Calls' instead of 'Sheet1'
- Check if the script is creating the 'Calls' sheet as expected

### Connection Issues with Resgrid API

- Verify RESGRID_USER and RESGRID_PASS secrets are set correctly
- Check the logs for authentication errors

## Scaling (Optional)

By default, the application runs on a single machine. If needed, you can scale:

```bash
# Scale to multiple machines
flyctl scale count 2

# Scale machine size
flyctl scale vm shared-cpu-1x
```

## Monitoring

Monitor your application's health:

```bash
# View logs
flyctl logs

# View application status
flyctl status

# Open the dashboard
flyctl dashboard
```

## Updates and Redeployment

When you have updates, simply run:

```bash
flyctl deploy
```

This will rebuild and redeploy your application with any changes.

## Security Considerations

- All sensitive information is stored in Fly.io secrets
- The GOOGLE_SERVICE_ACCOUNT_JSON contains private keys, so it should never be committed to the repository
- The service uses HTTPS for all communication with Resgrid API
- The health check endpoint doesn't expose any sensitive information