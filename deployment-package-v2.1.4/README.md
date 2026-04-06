# Resgrid-ESO Bridge Deployment Package v2.1.4

## Version v2.1.4 Features

### ✅ Recent Improvements
- **XML Namespace Compliance**: Fixed critical xmlns_xsi → xmlns:xsi syntax error
- **Enhanced Logging**: All log messages include [Call {callId}] context for improved debugging
- **Environment Validation**: Startup validation ensures all required secrets are configured
- **Code Cleanup**: Archived unused XML generator variants and legacy files
- **System Stability**: Comprehensive audit implementation based on ChatGPT analysis

### 🚀 Deployment Instructions

#### 1. Environment Setup
```bash
# Copy environment template
cp .env.resgrid-bridge .env

# Configure required secrets:
# - RESGRID_USER
# - RESGRID_PASS  
# - GOOGLE_SERVICE_ACCOUNT_JSON
# - LOG_SHEET_ID
```

#### 2. Local Development
```bash
npm install
npm start
```

#### 3. Production Deployment (Fly.io)
```bash
# Deploy to Fly.io
fly deploy

# Set secrets
fly secrets set RESGRID_USER="your_username"
fly secrets set RESGRID_PASS="your_password"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
fly secrets set LOG_SHEET_ID="your_sheet_id"
```

### 📋 System Features
- Real-time SignalR integration with Resgrid
- Automated XML generation with ESO compliance
- SFTP upload to ESO with retry logic
- Comprehensive Google Sheets logging
- Health monitoring and status reporting
- Automatic call polling backup mechanism
- XML integrity verification
- Patient information extraction
- Location field parsing from incident details
- Pacific Time timestamp preservation

### 🔧 Technical Specifications
- Node.js microservice architecture
- SignalR real-time event processing  
- XML generation with proper namespace formatting
- SFTP integration with ESO systems
- Google Sheets API integration
- Comprehensive error handling and logging
- Environment validation and fail-fast startup

### 📊 Monitoring & Health Checks
- Health endpoint: `GET /health`
- Real-time logging to Google Sheets
- XML upload status tracking
- Call processing metrics
- SignalR connection monitoring

---
**Package Version**: v2.1.4  
**Build Date**: 2025-06-09T06:06:23.057Z  
**Status**: Production Ready
