# Deployment Guide for Resgrid to ESO Bridge

## Overview

This document provides instructions for deploying the Resgrid to ESO Bridge application to various environments. The application is designed to be lightweight and containerized for easy deployment.

## Deployment Options

### 1. Docker Deployment

The application includes a Dockerfile for containerized deployment.

#### Build the Docker Image

```bash
docker build -t resgrid-eso-bridge .
```

#### Run the Container

```bash
docker run -d --name resgrid-eso-bridge \
  -e RESGRID_USER=your_username \
  -e RESGRID_PASS=your_password \
  -e SFTP_HOST=sftp.esosuite.net \
  -e SFTP_USER=your_sftp_username \
  -e SFTP_PASS=your_sftp_password \
  -e SFTP_DIR=/incoming \
  resgrid-eso-bridge
```

### 2. Fly.io Deployment

The application is pre-configured for deployment to Fly.io.

#### Prerequisites

- Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Authenticate with Fly.io: `fly auth login`

#### Deploy the Application

```bash
# Set up core secrets (one-time setup)
fly secrets set RESGRID_USER=your_username \
                RESGRID_PASS=your_password \
                SFTP_USER=your_sftp_username \
                SFTP_PASS=your_sftp_password

# Optional: Set up Google Sheets integration
# If using Google Sheets, encode the service account key as base64
cat google-service-account-key.json | base64 -w 0 > key.b64
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="$(cat key.b64)" \
                LOG_SHEET_ID=your_google_sheet_id

# Deploy the application
fly deploy
```

### 3. Node.js Server Deployment

#### Prerequisites

- Node.js 18 or higher
- npm or yarn

#### Setup and Run

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Start the service
node src/index.js
```

### 4. Process Manager (PM2) Deployment

For production Node.js deployments, use PM2 to ensure the application stays running.

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start src/index.js --name resgrid-eso-bridge

# Save the PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

## Environment Variables

The application requires the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| RESGRID_USER | Resgrid API username | Yes | None |
| RESGRID_PASS | Resgrid API password | Yes | None |
| SFTP_HOST | ESO SFTP server hostname | Yes | sftp.esosuite.net |
| SFTP_USER | ESO SFTP username | Yes | None |
| SFTP_PASS | ESO SFTP password | Yes | None |
| SFTP_DIR | ESO SFTP directory for uploads | Yes | /incoming |
| LOG_LEVEL | Winston logger level | No | info |
| PORT | Port for health check endpoint | No | 3000 |
| GOOGLE_SERVICE_ACCOUNT_KEY_PATH | Path to Google service account key file | No | None |
| GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 | Base64-encoded Google service account JSON | No | None |
| LOG_SHEET_ID | Google Sheet ID for logging | No | None |

## Deployment Package Creation

A utility script is included to create a deployment package:

```bash
node create-deployment-package.js
```

This creates a `.tar.gz` file containing all necessary files for deployment.

## Google Sheets Integration (Optional)

The application supports logging to Google Sheets for easier monitoring and auditing. To enable this feature:

1. **Create a Google Service Account**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project and enable the Google Sheets API
   - Create a service account with Editor permissions
   - Generate a JSON key for the service account

2. **Set Up Google Sheets**:
   - Create a new Google Sheet
   - Share it with the service account email (found in the JSON key)
   - Copy the Sheet ID from the URL (between `/d/` and `/edit`)

3. **Configure for Deployment**:

   For standard deployments:
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account-key.json
   LOG_SHEET_ID=your-google-sheet-id
   ```

   For Fly.io deployments, encode the service account JSON as base64:
   ```bash
   # Generate base64 string from the key file
   cat google-service-account-key.json | base64 -w 0
   
   # Then set it as a secret
   fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="the-base64-string" LOG_SHEET_ID="your-sheet-id"
   ```

For more detailed instructions, see [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md).

## Health Checks

The application includes a basic health check endpoint at `/health` that returns HTTP 200 if the service is running. This endpoint is essential for Fly.io deployments, as it listens on port 8080 to satisfy the platform's health check requirements.

The health check response includes:
- Status: Always "OK" when service is running
- Service name: "Resgrid-ESO Bridge"
- Current timestamp in ISO format
- Version number

Example response:
```json
{
  "status": "OK",
  "service": "Resgrid-ESO Bridge",
  "timestamp": "2025-05-06T20:30:45.123Z",
  "version": "1.1.2"
}
```

You can use this endpoint for container orchestration health probes in any deployment environment.

## Logs

Logs are written to both the console and the `logs` directory. The log files are rotated daily to prevent excessive disk usage.

## Monitoring

For production deployments, consider setting up monitoring:

1. **Standard Output**: All logs are written to stdout in JSON format for integration with log aggregation tools
2. **Health Endpoint**: Use the `/health` endpoint for uptime monitoring
3. **Metrics**: Basic metrics are available on the `/metrics` endpoint (when enabled)

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure firewall rules allow outbound connections to Resgrid and ESO
2. **Authentication Failures**: Verify credentials in environment variables
3. **SFTP Upload Failures**: Check SFTP directory permissions and path
4. **Module Not Found**: If you encounter a "Cannot find module './utils/priority'" error, ensure you're using the latest deployment package (v1.1.1+) which includes all necessary utility modules

### Checking Logs

```bash
# View the most recent logs
docker logs resgrid-eso-bridge -f

# Or on a direct Node.js deployment
tail -f logs/combined.log
```

## Updates and Maintenance

### Updating the Application

1. Pull the latest code from the repository
2. Rebuild the container or redeploy as described above
3. No database migrations are needed as the application is stateless

### Backup

The application is stateless, but consider backing up the logs directory periodically for audit purposes.

## Security Considerations

1. Store credentials securely using environment variables or secrets management
2. Restrict access to the deployed application
3. Use HTTPS for any exposed endpoints
4. Regularly update dependencies with `npm audit fix`