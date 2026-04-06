/**
 * Test script to verify the XML logging functionality
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory at: ${logsDir}`);
}

// Sample call data for testing
const testCall = {
  CallId: 'TEST-LOG-123',
  Timestamp: new Date().toISOString(),
  Nature: 'TEST - XML LOGGING',
  Address: '123 Test Street, Test City, TX 75001',
  UnitsCsv: 'Engine 1, Medic 2',
  Notes: 'This is a test call to verify XML logging functionality',
  
  // Additional test fields
  IncidentAddress1: '123 Test Street',
  City: 'Test City',
  State: 'TX',
  Priority: 'Medium',
  Driver: 'Test Driver'
};

// Generate XML
console.log(`Generating test XML for Call ID: ${testCall.CallId}`);
const xmlData = generateXML(testCall);

// Save to logs directory
const timestamp = Date.now();
const logFilePath = path.join(logsDir, `test_incident_${testCall.CallId}_${timestamp}.xml`);
fs.writeFileSync(logFilePath, xmlData);
console.log(`✅ Test XML saved to logs: ${logFilePath}`);

// List all files in the logs directory
console.log('\nFiles in logs directory:');
const files = fs.readdirSync(logsDir);
for (const file of files) {
  const filePath = path.join(logsDir, file);
  const stats = fs.statSync(filePath);
  console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB, created: ${stats.ctime})`);
}

console.log('\nXML logging test completed successfully.');