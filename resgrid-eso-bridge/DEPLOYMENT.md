# Resgrid to ESO Bridge - Deployment Guide

This guide will help you deploy the Resgrid to ESO Bridge service to Fly.io. This service listens for new calls from Resgrid via SignalR and forwards them as XML files to ESO via SFTP.

## Prerequisites

1. Install the Fly CLI on your machine:
   - **macOS**: `brew install flyctl`
   - **Windows**: `scoop install flyctl` or download the installer from Fly.io website
   - **Linux**: `curl -L https://fly.io/install.sh | sh`

2. Create a Fly.io account if you don't have one: https://fly.io/app/sign-up

## Deployment Steps

1. **Login to Fly.io**

   ```bash
   fly auth login
   ```

2. **Initialize the Application** (First-time only)

   If you haven't deployed this app before, initialize it:

   ```bash
   fly launch
   ```

   Choose a unique app name when prompted, and select your preferred region.

3. **Set Your Secret Environment Variables**

   ```bash
   # Resgrid credentials - required
   fly secrets set RESGRID_USER=your_resgrid_username
   fly secrets set RESGRID_PASS=your_resgrid_password
   
   # You can optionally use a token directly if you have one
   # fly secrets set RESGRID_TOKEN=your_token

   # ESO SFTP details - required
   fly secrets set SFTP_HOST=your_eso_sftp_host
   fly secrets set SFTP_USERNAME=your_eso_sftp_username  # or SFTP_USER
   fly secrets set SFTP_PASSWORD=your_eso_sftp_password  # or SFTP_PASS
   fly secrets set SFTP_REMOTE_PATH=/your/eso/incoming/path  # or SFTP_DIR
   
   # Optional configurations
   fly secrets set SFTP_PORT=22  # Default is 22, change if needed
   ```

4. **Deploy the Application**

   ```bash
   fly deploy
   ```

5. **Verify Deployment**

   Check the status of your deployment:

   ```bash
   fly status
   ```

   View logs to ensure the service is running correctly:

   ```bash
   fly logs
   ```

## Maintenance

- **View Logs**

   ```bash
   fly logs
   ```

- **SSH into the VM** (for troubleshooting)

   ```bash
   fly ssh console
   ```

- **Restart the Application**

   ```bash
   fly apps restart your-app-name
   ```

## Architecture

This bridge service:

1. Connects to Resgrid's SignalR hub to receive real-time call notifications
2. When a call is received, fetches additional data from Resgrid's API
3. Generates an XML file in the format required by ESO
4. Uploads the XML file to ESO's SFTP server

The service runs continuously on Fly.io, ensuring no calls are missed.

## Additional Features

- **Fetch Existing Calls**: You can manually trigger processing of existing active calls by SSH into the VM and running:
  ```bash
  node fetch-existing-calls.js
  ```

- **View Active Calls**: To see current active calls without processing them:
  ```bash
  node show-recent-calls.js
  ```