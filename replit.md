# Resgrid-ESO Bridge System Documentation

## Overview

The Resgrid-ESO Bridge is a production-grade Node.js emergency services data integration system that provides real-time synchronization between Resgrid emergency call management and ESO Electronic Patient Care Record systems. The application serves as a critical middleware service that processes emergency calls, generates ESO-compliant XML files, and maintains comprehensive audit trails through Google Sheets integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (April 2026)

- **24-Hour Stale Call Closure**: Added second auto-closure trigger — any call open for 24+ hours is force-closed regardless of unit status, as a safety net
- **Closure Reason Logging**: Auto-closure now records reason in logs (`units_inactive` vs `stale_call`) for full audit trail
- **Real Call Start Time**: Auto-closure now uses actual Resgrid `LoggedOn`/`DispatchTime` timestamps for accurate age calculation
- **Security Hardening**: All 14 dependency vulnerabilities resolved — `found 0 vulnerabilities`
  - Removed unused `xlsx` package (high severity, no fix available)
  - Upgraded `xmlbuilder2` to v4.0.3 (fixed critical `js-yaml` prototype pollution)
  - Auto-fixed 12 other vulnerabilities via npm audit fix (axios, body-parser, glob, jws, lodash, minimatch, path-to-regexp, qs, brace-expansion, form-data, fast-xml-parser)
- **Deployment Package**: Created `deployment-package-v2.2.1.zip` with Dockerfile, docker-compose, and full README
- **SFTP Test Fix**: Updated `test-eso-sftp-connection.js` to use environment variables (removed hardcoded credentials)

## Recent Changes (July 2025)

- **Auto-Closure Feature Added**: Implemented comprehensive auto-closure manager that automatically closes calls when all responding units become inactive
- **System-Wide Monitoring**: Updated auto-closure to check ALL units in system, not just call-assigned units
- **Enhanced Status Detection**: Updated auto-closure to recognize "Out of Service" status text AND status codes 4 and 10
- **Status Text Support**: Added support for undefined status IDs with "Out of Service" text recognition
- **System Integration**: Auto-closure manager integrated with SignalR events, polling mechanisms, and Google Sheets logging
- **Web Monitoring**: Added `/auto-closure` endpoint for real-time monitoring of auto-closure status
- **Component Verification**: Created comprehensive system verification with 100% success rate
- **Documentation**: Complete auto-closure feature guide and test scripts added

## System Architecture

### Core Components

The system follows a modular microservices architecture with the following key components:

1. **Event Processing Engine** (`src/index.js`)
   - SignalR WebSocket client for real-time event streaming from Resgrid
   - Backup polling mechanism (30-60 second intervals) for fault tolerance
   - Call lifecycle management and state tracking

2. **XML Generation Service** (`src/xml-generator.js`)
   - ESO-compliant XML file generation with proper schema validation
   - Timestamp formatting with 24-hour format fixes
   - Multi-unit support with nested XML structures

3. **SFTP Upload Client** (`src/fly-io-sftp-client.js`)
   - Cloud-optimized SFTP client with multiple connection strategies
   - Exponential backoff retry logic
   - ESO server compatibility with extended timeouts

4. **Google Sheets Logger** (`src/sheets-logger.js`)
   - Real-time logging with 37+ field mapping
   - Pacific Time standardization
   - Location column extraction from incident details

5. **Web Server** (Express.js endpoints)
   - Health monitoring endpoints
   - Test functionality for validation
   - Status reporting and metrics

### Authentication & Security

- **Resgrid API**: OAuth2 token management with automatic refresh
- **Google Sheets**: Service account authentication with JSON credentials
- **ESO SFTP**: Password-based authentication with secure connection handling

## Key Components

### Real-Time Event Processing

The system uses SignalR to maintain a persistent connection to Resgrid's event hub, processing:
- `CallAdded` events for new emergency calls
- `CallClosed` events for call closure detection
- `CallStateChanged` events for status updates
- `UnitStatusSet` events for unit activity monitoring

### Call Lifecycle Management

1. **Detection**: Real-time event capture or polling discovery
2. **Processing**: Data extraction and transformation
3. **XML Generation**: ESO-compliant file creation
4. **Upload**: SFTP transfer to ESO systems
5. **Logging**: Comprehensive audit trail in Google Sheets

### Data Transformation Pipeline

The system transforms Resgrid emergency call data through multiple stages:
- Raw API response parsing
- Field mapping and validation
- Timestamp standardization to Pacific Time
- Address parsing and GPS coordinate extraction
- Unit assignment and status tracking

### XML Generation Strategy

The XML generator produces two formats based on unit count:
- **Single Unit**: Flat XML structure for simple calls
- **Multiple Units**: Nested `<Units><Unit>` structure for complex responses

## Data Flow

### Primary Data Flow

1. **Event Trigger**: Emergency call created/updated in Resgrid
2. **Real-time Detection**: SignalR event or polling discovery
3. **Data Retrieval**: Resgrid API calls for complete call details
4. **Transformation**: Data mapping and field extraction
5. **XML Generation**: ESO-compliant XML file creation
6. **SFTP Upload**: Secure file transfer to ESO servers
7. **Audit Logging**: Google Sheets record creation/update

### Backup Mechanisms

- **Polling Fallback**: 30-60 second intervals when SignalR unavailable
- **Duplicate Prevention**: State fingerprinting prevents reprocessing
- **Retry Logic**: Exponential backoff for failed operations
- **Fallback Unit Assignment**: Automatic unit assignment when none specified

### Error Handling

The system implements comprehensive error handling:
- **API Failures**: Token refresh and endpoint fallbacks
- **SFTP Issues**: Multiple connection strategies and retry logic
- **Data Validation**: Field verification and fallback values
- **Logging Failures**: Graceful degradation with local error tracking

## External Dependencies

### Required Services

1. **Resgrid API** (api.resgrid.com)
   - Authentication endpoint for token management
   - Call data retrieval endpoints
   - SignalR hub for real-time events

2. **ESO SFTP Server** (sftp.esosuite.net)
   - XML file upload destination
   - Secure file transfer protocol
   - Directory-based organization

3. **Google Sheets API** (sheets.googleapis.com)
   - Service account authentication
   - Spreadsheet read/write operations
   - Real-time data logging

### Optional Dependencies

- **OpenStreetMap Nominatim API**: GPS coordinate geocoding fallback
- **Fly.io Platform**: Cloud hosting with optimized networking

### Environment Configuration

The system requires these environment variables:
- `RESGRID_USER`, `RESGRID_PASS`: Resgrid API credentials
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google Sheets service account
- `LOG_SHEET_ID`: Target Google Sheets spreadsheet ID
- `SFTP_HOST`, `SFTP_USER`, `SFTP_PASS`, `SFTP_DIR`: ESO SFTP configuration

## Deployment Strategy

### Container Deployment

The system is designed for containerized deployment using:
- **Docker**: Multi-stage build with Node.js 18+ runtime
- **Fly.io**: Cloud platform with optimized networking
- **Environment Variables**: Secure credential management through platform secrets

### Deployment Process

1. **Environment Setup**: Configure required environment variables
2. **Dependencies**: Install Node.js dependencies via npm
3. **Container Build**: Docker image creation with optimized layers
4. **Platform Deployment**: Fly.io deployment with health checks
5. **Validation**: Comprehensive system testing post-deployment

### Monitoring & Health Checks

- **Health Endpoints**: `/health`, `/status` for system monitoring
- **Component Status**: Individual service health reporting
- **Performance Metrics**: Response time and success rate tracking
- **Error Reporting**: Centralized logging with call ID context

### Scalability Considerations

The system is designed as a single-instance service due to:
- SignalR connection requirements (stateful)
- SFTP upload coordination needs
- Google Sheets rate limiting considerations
- Emergency services criticality requiring predictable behavior

However, the modular architecture supports future scaling through:
- Service separation (XML generation, SFTP upload, logging)
- Message queue integration for async processing
- Database integration for persistent state management