# Architecture Documentation

## Overview

The Resgrid to ESO Bridge is a Node.js service that acts as an integration layer between the Resgrid emergency services platform and the ESO patient care reporting system. The application listens for real-time call events from Resgrid via SignalR, processes the data, generates properly formatted XML files, and uploads them to ESO via SFTP.

This integration enables emergency services organizations using Resgrid for dispatch to automatically transmit incident details to ESO, eliminating manual data entry and reducing response times.

## System Architecture

The application follows a modular, event-driven architecture based on Node.js. It employs a microservice approach focused on a single responsibility: transforming and forwarding call data between systems.

### Core Architecture Decisions

1. **Event-Driven Design**: The system listens for real-time events (call additions) rather than using polling, ensuring immediate data transfer while minimizing resource usage.

2. **Modular Component Structure**: Functionality is divided into focused modules (SignalR client, token management, API communication, XML generation, SFTP transfer) to enhance maintainability and testability.

3. **Stateless Operation**: The application maintains minimal state, primarily caching authentication tokens, making it resilient and easy to deploy.

4. **Asynchronous Processing**: All operations use JavaScript's async/await pattern for efficient I/O handling and to prevent blocking the main thread.

5. **Centralized Configuration**: Environment variables (via dotenv) provide runtime configuration, facilitating deployment across environments.

## Key Components

### SignalR Client (`src/signalr-client.js`)
- Establishes and maintains a WebSocket connection to Resgrid's event hub
- Implements automatic reconnection with exponential backoff
- Handles SignalR events like `CallAdded` and dispatches them to the appropriate handlers

### Token Manager (`src/token-manager.js`)
- Responsible for Resgrid API authentication
- Maintains and refreshes authentication tokens
- Implements multiple authentication endpoints for fallback
- Caches tokens to minimize authentication requests

### Resgrid API Client (`src/resgrid-api.js`)
- Handles communication with the Resgrid API
- Fetches detailed call information when a call event is received
- Uses axios for HTTP requests with proper error handling

### XML Generator (`src/xml-generator.js`)
- Transforms Resgrid call data into ESO-compatible XML format
- Implements field mapping between the two systems
- Handles data validation and formatting

### SFTP Client (`src/sftp-client.js`) 
- Manages secure file transfers to the ESO SFTP server
- Creates remote directories if needed
- Implements retry logic for resilient file transfers

### Logger (`src/logger.js`)
- Provides structured logging with winston
- Supports different log levels and formats
- Logs to both console and files with rotation

## Data Flow

1. **Event Reception**: 
   - The SignalR client connects to Resgrid's event hub
   - When a new call is added in Resgrid, a `CallAdded` event is triggered

2. **Data Enrichment**:
   - The application receives the basic call data
   - It authenticates with the Resgrid API using credentials
   - It fetches additional call details using the call ID

3. **Data Transformation**:
   - The complete call data is transformed into an XML document
   - The XML follows ESO's required format with field mapping

4. **Data Transmission**:
   - The XML file is temporarily stored in the local filesystem
   - The application connects to the ESO SFTP server
   - The file is uploaded to the configured remote directory
   - The temporary file is removed

5. **Logging and Monitoring**:
   - Each step is logged with appropriate details
   - Errors are captured and logged for troubleshooting

## External Dependencies

### Resgrid Integration
- Uses Resgrid's SignalR events hub for real-time notifications
- Authenticates with Resgrid API using username/password credentials
- Fetches detailed call information from Resgrid's API

### ESO Integration
- Connects to ESO's SFTP server for file uploads
- Formats XML according to ESO's expected schema
- Uses a consistent GUID identifier in the XML format

### Key Libraries
- **@microsoft/signalr**: For real-time communication with Resgrid
- **axios**: For HTTP requests to the Resgrid API
- **ssh2-sftp-client**: For secure file transfer to ESO
- **xmlbuilder2**: For generating properly formatted XML files
- **winston**: For structured logging
- **dotenv**: For environment-based configuration

## Deployment Strategy

The application is designed for containerized deployment using Docker, with Fly.io as the primary deployment platform. This approach ensures consistency across environments and simplifies scalability.

### Deployment Components

1. **Docker Container**:
   - Node.js 18 Alpine base image for minimal size
   - Multi-stage build process for efficiency
   - Environment variables for runtime configuration

2. **Fly.io Deployment**:
   - Single-instance deployment for cost efficiency
   - Secrets management for credentials
   - Automatic restart and healing
   - Region-specific deployment for performance

### Configuration Management

- Environment variables are used for all configuration
- Sensitive credentials are stored as Fly.io secrets
- A `.env.example` file provides documentation for required variables
- Support for various naming conventions (e.g., SFTP_USER or SFTP_USERNAME)

### Monitoring and Maintenance

- Detailed logging to files and console
- Log rotation to prevent disk space issues
- Automatic reconnection for resilience
- Health checks for monitoring

## Security Considerations

- Credentials are never hardcoded, using environment variables instead
- API tokens are automatically refreshed before expiration
- Files are securely transferred via SFTP
- Temporary files are cleaned up after successful transfer
- Minimal dependencies to reduce vulnerability surface area

## Future Architecture Considerations

1. **Message Queue**: Adding a message queue (like RabbitMQ or SQS) could improve resilience against temporary outages of either system.

2. **Database Integration**: A lightweight database could store call history and processing status for better tracking and retry capabilities.

3. **Monitoring Dashboard**: Adding a web interface for monitoring call processing status and viewing logs.

4. **Multi-tenancy**: Enhancing the system to support multiple Resgrid/ESO connections for different organizations.