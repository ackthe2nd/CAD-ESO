FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create necessary directories
RUN mkdir -p logs
RUN mkdir -p src/utils

# Copy application files
COPY src/ ./src/
COPY listener.js ./
COPY fetch-existing-calls.js ./
COPY export-calls-to-sheets.js ./
COPY export-calls-to-sheets-enhanced.js ./
COPY show-recent-calls.js ./
COPY test-token-refresh.js ./
COPY TOKEN_REFRESH.md ./
COPY GOOGLE_SHEETS_INTEGRATION.md ./
COPY GOOGLE_SHEETS_EXPORT_GUIDE.md ./

# Set environment variables (these will be overridden at runtime)
ENV RESGRID_USER=placeholder
ENV RESGRID_PASS=placeholder
ENV SFTP_HOST=placeholder
ENV SFTP_USERNAME=placeholder
ENV SFTP_PASSWORD=placeholder
ENV SFTP_REMOTE_PATH=/incoming
ENV LOGS_DIR=./logs
ENV DEBUG=false
ENV MAX_RETRIES=3
ENV RETRY_DELAY=5000
ENV ESO_GUID=b394de98-a5b7-408d-a1f2-020eddff92b9
ENV LOG_SHEET_ID=placeholder
# GOOGLE_SERVICE_ACCOUNT_JSON will be set as a secret

# Run the application
CMD ["node", "listener.js"]