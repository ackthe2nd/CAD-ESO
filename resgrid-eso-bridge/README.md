# Resgrid to ESO Bridge

A Node.js service that listens for Resgrid SignalR events and forwards call data as XML to ESO via SFTP.

## Features

- Connects to Resgrid SignalR hub to listen for new calls in real-time
- Automatically handles API authentication with credentials
- Refreshes API tokens as needed
- Fetches detailed call information from Resgrid API
- Generates XML files formatted according to ESO requirements
- Uploads files securely via SFTP
- Provides detailed logging for monitoring and troubleshooting
- Includes utilities to view and process existing calls

## Deployment Instructions

### Environment Variables

Create a `.env` file or set the following environment variables:

```
# Resgrid API Configuration
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# SFTP Configuration for ESO
SFTP_HOST=sftp.example.com
SFTP_USER=sftp_username
SFTP_PASS=sftp_password
SFTP_DIR=/incoming/calls
```

### Fly.io Deployment

```bash
npm install
npm i -g flyctl
fly launch --name resgrid2eso --no-deploy
fly secrets set RESGRID_USER=<username> RESGRID_PASS=<password> SFTP_HOST=<host> SFTP_USER=<u> SFTP_PASS=<p> SFTP_DIR=/incoming
fly deploy
```

**Important Note:** Set `RESGRID_USER` and `RESGRID_PASS` as Fly.io secrets instead of `RESGRID_TOKEN`; the service now logs in automatically and refreshes when the token expires.

## How It Works

1. The service establishes a connection to the Resgrid SignalR hub
2. When a new call is added, the `CallAdded` event is triggered
3. The service uses Resgrid credentials to obtain an API token
4. The token is used to fetch detailed call data from the Resgrid API
5. XML is generated with the call information
6. The XML file is uploaded to the ESO SFTP server as `incident_{CallId}.xml`
7. The service logs `✅ pushed {CallId}` on success

## Automatic Token Refresh

The service now automatically handles Resgrid API authentication:

- Logs in with RESGRID_USER and RESGRID_PASS credentials
- Caches the token and its expiration time
- Refreshes the token 60 seconds before expiration
- No need to manually obtain and update API tokens

## Additional Utilities

This package includes several utility scripts:

### 1. Real-time Listener (`listener.js`)
The main service that connects to Resgrid SignalR and listens for new calls.
```bash
node listener.js
```

### 2. View Recent Calls (`show-recent-calls.js`)
Display active calls from Resgrid without processing them.
```bash
node show-recent-calls.js
```

### 3. Process Existing Calls (`fetch-existing-calls.js`)
Fetch and process active calls from Resgrid, generating XML and uploading to ESO.
```bash
node fetch-existing-calls.js --days=7
```

### 4. Test Scripts
Various test scripts are included to verify different components of the system:
- `test-connect-token.js` - Test Resgrid authentication
- `test-xml-generation.js` - Test XML generation
- `test-sftp-mock.js` - Test SFTP upload with a mock client
- `test-full-workflow.js` - Test the entire workflow with mock data

## Deployment

For detailed deployment instructions, see the [Deployment Guide](DEPLOYMENT.md).