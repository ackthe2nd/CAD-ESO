# Installation Guide - Resgrid-ESO Bridge v2.1.3

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Access to Resgrid API credentials
- Google Service Account with Sheets API access
- ESO SFTP credentials

### 2. Installation
```bash
# Extract or clone the deployment package
cd deployment-package-v2.1.3-final

# Install dependencies
npm install

# Configure environment
cp .env.template .env
# Edit .env with your actual credentials
```

### 3. Environment Setup
Edit `.env` file with your credentials:

```bash
# Required: Resgrid credentials
RESGRID_USER=your_username
RESGRID_PASS=your_password

# Required: Google Sheets integration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
LOG_SHEET_ID=your_spreadsheet_id

# Required: ESO SFTP access
SFTP_PASS=your_eso_password
```

### 4. Start the Service
```bash
# Start the application
npm start

# Or run directly
node src/index.js
```

### 5. Verify Installation
```bash
# Check system health
npm run health

# Test call processing
curl http://localhost:5000/test/201105
```

## System Components

### Core Services
- **SignalR Listener**: Real-time event processing from Resgrid
- **XML Generator**: Creates ESO-compliant XML files
- **SFTP Client**: Uploads XML files to ESO servers
- **Google Sheets Logger**: Comprehensive call data logging with Location column fix
- **Health Monitor**: System status and integrity checking

### Location Column Feature
The system extracts location descriptions from incident details:
- Input: `"LOCATION: Parking lot - 6411 Sepulveda Blvd..."`
- Output: `"Parking lot"`
- Position: Column I (Index 8) in Google Sheets

## Configuration Details

### Google Sheets Setup
1. Create a Google Service Account
2. Download the service account JSON key
3. Share your Google Sheet with the service account email
4. Set LOG_SHEET_ID to your spreadsheet ID

### ESO SFTP Configuration
- Host: sftp.esosuite.net
- User: CA-EMS
- Directory: /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
- Port: 22

### Resgrid API Access
Obtain API credentials from your Resgrid account administrator.

## Monitoring

### Health Checks
- Endpoint: `GET http://localhost:5000/health`
- Returns system status and version information

### Test Endpoints
- Test specific calls: `GET http://localhost:5000/test/{callId}`
- Validates XML generation and SFTP upload capability

### Logging
- Console output with timestamps
- Google Sheets comprehensive logging
- SFTP upload status tracking

## Production Deployment

### Docker Option
```bash
# Build container
docker build -t resgrid-eso-bridge .

# Run with environment file
docker run --env-file .env -p 5000:5000 resgrid-eso-bridge
```

### System Service
Create a systemd service for automatic startup:

```ini
[Unit]
Description=Resgrid-ESO Bridge
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/deployment-package-v2.1.3-final
ExecStart=/usr/bin/node src/index.js
EnvironmentFile=/path/to/.env
Restart=always

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Common Issues
1. **Connection failures**: Verify credentials and network connectivity
2. **Google Sheets errors**: Check service account permissions
3. **SFTP upload issues**: Confirm ESO credentials and directory permissions
4. **SignalR disconnections**: System auto-reconnects, monitor logs

### Support Information
- System logs provide detailed error information
- Test endpoints help isolate component issues
- Health endpoint shows overall system status

## Security Notes
- Store credentials securely in environment variables
- Limit Google Service Account permissions to necessary scopes
- Monitor SFTP access logs
- Regularly rotate API credentials

This installation provides a complete emergency service data integration system with the Location column fix implemented and verified.