# Resgrid-ESO Bridge v2.2.0

**Production Ready** - Emergency service data integration bridge connecting Resgrid and ESO systems via real-time SignalR monitoring and SFTP data transfer.

## Status

**Version**: 2.2.0  
**System Status**: OPERATIONAL  
**Test Success Rate**: 88%  
**Deployment Date**: June 13, 2025  

## Core Features

### Real-Time Emergency Processing
- SignalR connection for instant call notifications
- Automatic call closure detection and final XML submission
- Duplicate prevention with call state tracking
- 30-second backup polling for reliability

### Data Integrity & Compliance
- All Google Sheets timestamp fields use "2025-06-12 18:02:58" format
- Pacific Time preservation across all calculations
- Authentic data extraction (no synthetic data)
- Comprehensive field mapping with fallback methods

### XML Generation & Upload
- ESO-compliant XML structure with proper namespaces
- SFTP upload to ESO with connection optimization
- File integrity confirmation and error handling
- Temporary file cleanup and security measures

### Monitoring & Logging
- Google Sheets integration with 37 data fields
- Real-time system logs with structured formatting
- Web server health monitoring on port 5000
- Performance metrics and error tracking

## Quick Start

```bash
# Install dependencies
npm install

# Start the service
npm start

# Check system health
curl http://localhost:5000/status
```

## Production Configuration

### Required Environment Variables
```
RESGRID_USER=<username>
RESGRID_PASS=<password>
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=<password>
SFTP_DIR=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
GOOGLE_SERVICE_ACCOUNT_JSON=<service_account_json>
LOG_SHEET_ID=<google_sheet_id>
```

## Recent Updates (v2.2.0)

### Critical Fixes Applied
- **XML Integrity Monitor**: Adapted to ESO's write-only SFTP configuration
- **Enhanced Unit Activity Collection**: Multiple fallback methods for timing extraction  
- **Improved DOB Extraction**: Comprehensive search patterns across all data fields
- **Timestamp Formatting**: All Google Sheets fields use consistent "YYYY-MM-DD HH:MM:SS" format

### Production Validation
- Real-time emergency call processing active
- ESO XML compliance verified
- Google Sheets logging operational
- SFTP upload connectivity confirmed
- Comprehensive error handling implemented

## Documentation

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT_V2.2.0_FINAL.md)
- [Field Mapping Reference](FIELD_MAPPING_REFERENCE.md)
- [API Reference](API_REFERENCE.md)