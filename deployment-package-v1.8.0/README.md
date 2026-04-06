# Resgrid-ESO Bridge v1.8.0
**Production-Ready Emergency Service Data Integration**

## Quick Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Service
```bash
npm start
```

## System Health: 🟢 OPERATIONAL

**Active Features:**
- Real-time Resgrid call monitoring
- ESO-compliant XML generation
- Google Sheets data logging
- SFTP upload to ESO systems
- Upload status tracking

## Core Files

- `src/index.js` - Main application
- `src/xml-generator.js` - ESO XML creation
- `src/sheets-logger.js` - Google Sheets integration
- `src/resgrid-api.js` - API communication
- `src/fly-io-sftp-client.js` - SFTP uploads

## Verification Scripts

- `system-status-check.js` - Complete system health check
- `verify-upload-status.js` - Google Sheets status verification
- `test-upload-status-fix.js` - Upload status testing

## Documentation

- `DEPLOYMENT_GUIDE_V1.8.0.md` - Complete deployment instructions
- `CHANGELOG_V1.8.0.md` - Version changes and improvements
- `SYSTEM_STATUS_V1.8.0.md` - Current system health report

## Environment Variables

```bash
# Required
RESGRID_USER=your_username
RESGRID_PASS=your_password
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"...}
LOG_SHEET_ID=your_sheet_id

# Optional (for ESO uploads)
SFTP_PASS=your_eso_password
```

## Support

Run health check: `node system-status-check.js`
Check upload status: `node verify-upload-status.js`

---
**Version 1.8.0** | **Production Ready** | **June 8, 2025**