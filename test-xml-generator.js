/**
 * Test script to verify our XML generator produces proper XML
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getApiToken } = require('./src/token-manager');
const { generateXML } = require('./src/xml-generator');

// Sample call data for testing
const sampleCall = {
  "CallId": "12345",
  "Timestamp": new Date().toISOString(),
  "Nature": "TEST CALL - Medical Emergency",
  "Address": "123 Test Street, Test City, TX",
  "UnitsCsv": "Engine 1, Medic 2, Battalion 3",
  "Notes": "This is a test call. Patient complaining of chest pain. BP 120/80, HR 90, SpO2 98%."
};

/**
 * Test XML generation with a complete sample call
 */
async function testXmlGeneration() {
  console.log("Testing XML generation...");
  
  try {
    console.log("Sample call data:", sampleCall);
    
    // Create a directory for test files if it doesn't exist
    const testDir = '/tmp/resgrid-eso-test';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Generate XML
    const xml = generateXML(sampleCall);
    
    // Save to temp file
    const timestamp = Date.now();
    const filePath = path.join(testDir, `test_call_${timestamp}.xml`);
    fs.writeFileSync(filePath, xml);
    
    console.log("Generated XML:");
    console.log(xml);
    console.log(`XML file saved to: ${filePath}`);
    
    // Validate that critical elements exist
    if (xml.includes("<IncidentAddress1>") && !xml.includes("</IncidentAddress1>>")) {
      console.log("XML validation passed: Address tag correctly formatted");
    } else {
      console.error("XML validation failed: Address tag incorrectly formatted");
    }
    
    // Check patient fields
    if (xml.includes("<PatientFirstName>") && xml.includes("<PatientLastName>") &&
        xml.includes("<PatientPhone>") && xml.includes("<PatientDOB>")) {
      console.log("XML validation passed: Patient fields included");
    } else {
      console.warn("XML validation warning: Some patient fields may be missing");
    }
    
    console.log("XML generation test completed successfully");
  } catch (error) {
    console.error(`Error during XML generation test: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
testXmlGeneration();