/**
 * Test Service Integration
 * This script tests that our main service can properly integrate with the XML generator
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator');

// Set up logger
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  if (isError) {
    console.error(logMessage);
  }
}

/**
 * Create test call with unit times for XML generation
 */
function createTestCallWithTimes() {
  return {
    GetCall: {
      Data: {
        CallId: 'TEST-INTEGRATION-123',
        LoggedOn: '2025-05-06T10:00:00.000Z',
        Name: 'Integration Test Call',
        Nature: 'Testing integration with all fields',
        Type: 'Medical Emergency',
        Address: '123 Test St, Test City, CA 90210, USA',
        Geolocation: '34.12345,-118.12345',
        Priority: { Id: 1560 }
      }
    },
    GetCallExtraData: {
      Data: {
        Dispatches: [
          {
            Id: '12345',
            Type: 'Unit',
            Name: 'ENG1',
            Location: 'Station 1',
            // Adding all the unit timestamps
            EnRouteTime: '2025-05-06T10:05:00.000Z',
            ArrivedTime: '2025-05-06T10:12:00.000Z',
            AtPatientTime: '2025-05-06T10:15:00.000Z',
            ClearedTime: '2025-05-06T10:30:00.000Z'
          }
        ],
        Priority: { Id: 1560, Name: "Emergent" }
      }
    }
  };
}

/**
 * Test the integration
 */
function testIntegration() {
  log('Testing service integration with XML generator...');
  
  // Create test data
  const testData = createTestCallWithTimes();
  
  // Generate XML
  const xml = generateXML(testData);
  
  // Save XML to log directory
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const outputPath = path.join(logsDir, 'integration_test.xml');
  fs.writeFileSync(outputPath, xml);
  
  log(`XML saved to ${outputPath}`);
  
  // Verify essential fields
  log('\nVerifying essential XML fields...');
  
  // Check for response mode (priority removed per requirements)
  const hasResponseMode = xml.includes('<ResponseModeToScene>390</ResponseModeToScene>');
  log(`Response mode: ${hasResponseMode ? '✓ PASSED' : '✗ FAILED'}`);
  
  // Check for address parsing
  const hasAddressParsing = xml.includes('<IncidentCity>Test City</IncidentCity>') && 
                           xml.includes('<IncidentState>CA</IncidentState>') && 
                           xml.includes('<IncidentZip>90210</IncidentZip>');
  log(`Address parsing: ${hasAddressParsing ? '✓ PASSED' : '✗ FAILED'}`);
  
  // Check for unit times
  const hasUnitTimes = xml.includes('<UnitEnRoute>2025-05-06T10:05:00.000Z</UnitEnRoute>') && 
                      xml.includes('<UnitArrivedOnScene>2025-05-06T10:12:00.000Z</UnitArrivedOnScene>') && 
                      xml.includes('<UnitAtPatient>2025-05-06T10:15:00.000Z</UnitAtPatient>') && 
                      xml.includes('<UnitCleared>2025-05-06T10:30:00.000Z</UnitCleared>');
  log(`Unit times: ${hasUnitTimes ? '✓ PASSED' : '✗ FAILED'}`);
  
  // Vehicle dispatch location removed per requirements
  const noVehicleDispatchLocation = !xml.includes('<VehicleDispatchLocation>');
  log(`No vehicle dispatch location: ${noVehicleDispatchLocation ? '✓ PASSED' : '✗ FAILED'}`);
  
  // Check for GUID
  const hasGuid = xml.includes('<Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>');
  log(`GUID: ${hasGuid ? '✓ PASSED' : '✗ FAILED'}`);
  
  // Overall success
  const success = hasResponseMode && hasAddressParsing && hasUnitTimes && noVehicleDispatchLocation && hasGuid;
  log(`\nOverall integration test: ${success ? '✓ PASSED' : '✗ FAILED'}`);
  
  return success;
}

// Run the test
testIntegration();