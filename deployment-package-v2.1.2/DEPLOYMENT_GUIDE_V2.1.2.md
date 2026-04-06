# Deployment Guide - Resgrid-ESO Bridge v2.1.2

## Complete Integration System with Enhanced Closure Logging

### Package Contents
```
deployment-package-v2.1.2/
├── src/                                    # Complete source code
│   ├── index.js                           # Main service with enhanced closure logging
│   ├── fly-io-sftp-client.js             # Enhanced SFTP connection strategies
│   ├── sheets-logger.js                  # Pacific Time logging system
│   ├── xml-generator.js                  # Multi-unit XML generation
│   ├── test-endpoint.js                  # Enhanced test functionality
│   └── xml-integrity-monitor.js          # Real-time verification
├── package.json                          # Dependencies and scripts
├── Dockerfile                            # Production container
├── .env.example                          # Environment template
├── README_V2.1.2.md                     # Complete system documentation
├── SYSTEM_TEST_RESULTS_V2.1.2.md        # Comprehensive test validation
└── FLY_IO_SFTP_ENHANCEMENT_V2.1.1.md    # SFTP resilience documentation
```

### Prerequisites
- Node.js 18+ runtime environment
- Google Service Account with Sheets API access
- Resgrid API credentials with department access
- ESO SFTP server credentials

### Environment Setup

#### 1. Extract Deployment Package
```bash
tar -xzf resgrid-eso-bridge-v2.1.2.tar.gz
cd deployment-package-v2.1.2
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your specific credentials:
```bash
# Resgrid Integration
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# ESO SFTP Server
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=your_sftp_password
SFTP_DIR=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9

# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_JSON=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50...
LOG_SHEET_ID=1ABcDEfGHiJkLmNoPqRsTuVwXyZ

# Application Settings
NODE_ENV=production
PORT=5000
```

### Deployment Options

#### Option 1: Docker Deployment (Recommended)
```bash
# Build container
docker build -t resgrid-eso-bridge:v2.1.2 .

# Run with environment file
docker run -d \
  --name resgrid-eso-bridge \
  --env-file .env \
  -p 5000:5000 \
  --restart unless-stopped \
  resgrid-eso-bridge:v2.1.2

# Verify deployment
docker logs resgrid-eso-bridge
curl http://localhost:5000/health
```

#### Option 2: Fly.io Deployment
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Deploy application
fly deploy

# Monitor deployment
fly logs
```

#### Option 3: Direct Node.js
```bash
# Install dependencies
npm install

# Start service
npm start

# Or with PM2 for production
npm install -g pm2
pm2 start src/index.js --name resgrid-eso-bridge
```

### Post-Deployment Verification

#### 1. Health Check
```bash
curl http://localhost:5000/health
```
Expected response:
```json
{
  "status": "OK",
  "service": "Resgrid-ESO Bridge",
  "timestamp": "2025-06-09T03:43:26.225Z",
  "version": "1.1.2"
}
```

#### 2. XML Integrity Monitor
```bash
curl http://localhost:5000/integrity
```
Expected response:
```json
{
  "success": true,
  "integrity": {
    "totalChecked": 0,
    "matched": 0,
    "mismatched": 0,
    "notFound": 0,
    "matchRate": "0.0",
    "lastCheck": "2025-06-09T03:27:34.715Z"
  }
}
```

#### 3. Test Call Processing
```bash
curl -X POST http://localhost:5000/api/test/{callId}
```
Replace `{callId}` with an actual call ID from your system.

### Enhanced Features Verification

#### SFTP Connection Resilience
Monitor logs for connection strategy success:
```
2025-06-09 03:43:37 [info]: Attempting Fly.io SFTP connection with: Fly.io Quick Connect
2025-06-09 03:43:38 [info]: Fly.io SFTP connection successful with Fly.io Quick Connect on attempt 1
```

#### Closure Logging System
Watch for closure detection in logs:
```
2025-06-09 03:43:40 [info]: 📋 CALL CLOSURE DETECTED - Call 201192 transitioned from Active to Closed
2025-06-09 03:43:40 [info]: Call 201192 detected as closed (State: 1), capturing closure time: 2025-06-08 20:43:40
```

#### Google Sheets Integration
Verify Pacific Time formatting in sheets:
```
Call Received Time: 2025-06-08 13:27:04
Unit Dispatched Times: 2025-06-08 06:27:04, 2025-06-08 06:27:04
Last Updated: 2025-06-08 20:43:40
```

### Monitoring and Maintenance

#### Key Log Patterns
- **Connection Success**: "Fly.io Quick Connect" - Primary strategy working
- **Closure Detection**: "CALL CLOSURE DETECTED" - State transition logging
- **Test Operations**: "[TEST BUTTON]" - Test vs production distinction
- **Final Uploads**: "Final Closure Upload" - Closure XML completion

#### Performance Metrics
- SFTP connection time: <2 seconds
- XML generation: 2000+ characters in <1 second
- Google Sheets update: <500ms
- Complete test cycle: ~15 seconds

#### Troubleshooting

**SFTP Connection Issues**:
- Check credentials in environment variables
- Verify SFTP_HOST accessibility
- Monitor for "HANDSHAKE_FAILURE" errors (should be resolved)

**Google Sheets Issues**:
- Verify GOOGLE_SERVICE_ACCOUNT_JSON is properly base64 encoded
- Check LOG_SHEET_ID matches your Google Sheet
- Ensure service account has editor access

**Call Processing Issues**:
- Verify RESGRID_USER and RESGRID_PASS credentials
- Check SignalR connection logs
- Monitor polling mechanism for backup processing

### Production Considerations

#### Security
- Environment variables contain sensitive credentials
- Use secure credential management in production
- Rotate API keys regularly

#### Scalability
- Single instance handles multiple concurrent calls
- Backup polling mechanism ensures reliability
- Enhanced SFTP strategies handle network variations

#### Backup and Recovery
- Google Sheets provides complete audit trail
- XML files uploaded to ESO server for redundancy
- Log files contain detailed operational history

### Support and Updates
- Monitor health endpoint for system status
- Review Google Sheets logs for operational insights
- Check SFTP connection success rates
- Verify closure logging completeness

This deployment provides complete emergency services integration with enhanced reliability, comprehensive logging, and production-grade operational visibility.