/**
 * Simple Test Server for Call Testing
 * Standalone HTTP server to test the test functionality
 */

require('dotenv').config();
const express = require('express');
const testEndpoint = require('./src/test-endpoint');

const app = express();
const port = 5000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get(['/', '/health'], (req, res) => {
  console.log(`Health check request received: ${req.method} ${req.url}`);
  res.json({
    status: 'OK',
    service: 'Resgrid-ESO Bridge Test Server',
    timestamp: new Date().toISOString(),
    version: '1.1.2',
    testFunctionalityEnabled: true
  });
});

// Test endpoints
app.use('/api', testEndpoint);

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on port ${port}`);
  console.log(`Test endpoints available at http://localhost:${port}/api/test/{callId}`);
});