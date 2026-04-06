# Deploying to Fly.io

This guide provides detailed instructions for deploying the Resgrid to ESO Bridge to Fly.io, including setting up Google Sheets integration.

## Prerequisites

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up for Fly.io: https://fly.io/docs/hands-on/sign-up/
3. Log in to Fly.io: `fly auth login`
4. Google service account credentials (see [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md))

## Deployment Steps

### 1. Prepare Your Application

Ensure you have the latest version of the application:

```bash
# Clone the repository (if not already done)
git clone https://github.com/your-repo/resgrid-eso-bridge.git
cd resgrid-eso-bridge

# Install dependencies
npm install
```

### 2. Initialize Fly.io Application

```bash
# Create a new Fly.io application (skip deployment)
fly launch --name resgrid2eso --no-deploy
```

When prompted, select:
- No to PostgreSQL
- No to Redis
- Yes to deploying now (this will create the app but won't deploy yet)

### 3. Set Environment Variables

Set the required environment variables as secrets:

```bash
fly secrets set \
  RESGRID_USER=your_username \
  RESGRID_PASS=your_password \
  SFTP_HOST=sftp.esosuite.net \
  SFTP_USER=your_sftp_username \
  SFTP_PASS=your_sftp_password \
  SFTP_DIR=/incoming
```

### 4. Set Up Google Sheets Integration

The recommended approach for Fly.io is to use base64-encoded credentials:

1. **Base64 encode your service account JSON**:

   ```bash
   # On Linux/macOS:
   cat google-service-account-key.json | base64 -w 0 > service-account-base64.txt

   # On Windows PowerShell:
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw -Path google-service-account-key.json))) > service-account-base64.txt
   ```

2. **Set the base64-encoded JSON and sheet ID as secrets**:

   ```bash
   fly secrets set \
     GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=$(cat service-account-base64.txt) \
     LOG_SHEET_ID=your_google_sheet_id
   ```

### 5. Deploy the Application

```bash
fly deploy
```

### 6. Verify Deployment

```bash
# Check if the application is running
fly status

# View logs
fly logs
```

## Using the Google Sheets Export Functionality

After deployment, you can directly export calls to Google Sheets from Fly.io:

### Option 1: Using the PowerShell Script

From your local machine (requires PowerShell and Fly CLI):

```powershell
# Export active calls
./export-calls-to-sheets.ps1 -Active

# Export calls from the last 7 days (default)
./export-calls-to-sheets.ps1

# Export calls from the last 30 days
./export-calls-to-sheets.ps1 -Days 30
```

### Option 2: Using Fly SSH Console Directly

```bash
# Export active calls
fly ssh console -C "node export-calls-to-sheets.js --active"

# Export calls from the last 7 days (default)
fly ssh console -C "node export-calls-to-sheets.js"

# Export calls from the last X days
fly ssh console -C "node export-calls-to-sheets.js --days=30"
```

### Option 3: Scheduling Regular Exports

You can schedule regular exports using your local machine's task scheduler:

#### Windows Task Scheduler Example

Create a scheduled task that runs:

```
powershell -ExecutionPolicy Bypass -File C:\path\to\export-calls-to-sheets.ps1 -Active
```

#### Linux/MacOS Cron Example

Add a cron job:

```bash
# Edit crontab
crontab -e

# Add this line to export active calls every 30 minutes
*/30 * * * * /usr/local/bin/fly ssh console -C "node export-calls-to-sheets.js --active" >> ~/resgrid_export.log 2>&1
```

## Troubleshooting

### 1. Connection Issues

If you encounter connection issues:

```bash
# Check the application status
fly status

# Restart the application if needed
fly restart
```

### 2. Google Sheets Authentication Issues

If Google Sheets authentication fails:

1. Verify your service account JSON was correctly base64 encoded
2. Ensure you've shared the Google Sheet with the service account email
3. Check that the LOG_SHEET_ID is correct

To test Google Sheets integration directly:

```bash
fly ssh console -C "node test-google-sheets-secret.js"
```

### 3. Log Access

Access logs to investigate issues:

```bash
# View real-time logs
fly logs

# View recent logs
fly logs --instance machine-id
```

## Additional Commands

```bash
# SSH into the machine for troubleshooting
fly ssh console

# Scale the application (if needed)
fly scale count 1

# Set a new secret
fly secrets set NEW_SECRET=value

# Deploy changes after updates
fly deploy
```

For more detailed Fly.io documentation, visit: https://fly.io/docs/