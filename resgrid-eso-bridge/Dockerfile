FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create logs directory
RUN mkdir -p logs

# Copy application files
COPY src/ ./src/
COPY listener.js ./
COPY fetch-existing-calls.js ./
COPY show-recent-calls.js ./

# Set environment variables (these will be overridden at runtime)
ENV RESGRID_USER=placeholder
ENV RESGRID_PASS=placeholder
ENV SFTP_HOST=placeholder
ENV SFTP_USERNAME=placeholder
ENV SFTP_PASSWORD=placeholder
ENV SFTP_REMOTE_PATH=/incoming

# Run the application
CMD ["node", "listener.js"]