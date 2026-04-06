/**
 * Test script to verify that our fixed XML generator produces 
 * correctly formatted output without XML errors
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator-exact-match');

// Simplified test call data that matches real call structure
const testCall = {
  GetCall: {
    Data: {
      CallId: "198424",
      LoggedOn: "2025-05-04T15:40:29.397Z",
      Name: "TEST - Form Submit",
      Priority: "1560",
      PriorityId: 1560,
      Nature: "- INCIDENT TYPE: Medical Emergency - LOCATION: 14051 Califa S (Front Yard) - ALERTS: NOT BREATHING? (NO) - NOT CONSCIOUS? (NO) - DETAILS: ADDITIONAL DETAILS - COMPLAINANT: FIRSTNAME LASTNAME (111) 111-1111  I am the Patient - HAS 911 BEEN CONTACTED?:  - Submitted via EMIDF",
      Type: "Medical Emergency",
      Address: "14051 Califa St, Sherman Oaks, CA 91401, USA",
      Note: "Submitted by EMS Incident Dispatch Form",
      Geolocation: "34.164543,-118.442475",
      ContactName: "FIRSTNAME LASTNAME",
      ContactInfo: "(111) 111-1111",
      ExternalId: "01-01-1970"
    }
  },
  GetCallExtraData: {
    Data: {
      Dispatches: [
        {
          Type: "Unit",
          Name: "STN1",
          EnRouteTime: "2025-05-04T15:42:10.123Z",
          ArrivedTime: "2025-05-04T15:50:33.456Z",
          AtPatientTime: "2025-05-04T15:51:45.789Z",
          ClearedTime: "2025-05-04T16:20:05.012Z"
        }
      ]
    }
  }
};

function main() {
  console.log("Testing fixed XML generator...");
  
  try {
    // Generate XML
    const xml = generateXML(testCall);
    
    // Save to file for inspection
    const outputPath = path.join(__dirname, 'logs', 'call_198424_fixed_match.xml');
    fs.writeFileSync(outputPath, xml);
    
    console.log("Generated XML with fixed formatting:");
    console.log(xml);
    console.log(`\nXML saved to: ${outputPath}`);
    
    // Validate basic XML structure
    if (xml.includes('</IncidentAddress1>>')) {
      console.error("❌ ERROR: XML still contains malformed IncidentAddress1 tag");
    } else if (!xml.includes('<IncidentAddress1>')) {
      console.error("❌ ERROR: XML missing IncidentAddress1 tag");
    } else {
      console.log("✅ SUCCESS: XML contains properly formatted IncidentAddress1 tag");
    }
    
    // Check for basic patient data inclusion
    if (xml.includes('<PatientFirstName>FIRSTNAME</PatientFirstName>')) {
      console.log("✅ SUCCESS: Patient first name correctly extracted");
    } else {
      console.warn("⚠️ WARNING: Patient first name may not be correctly extracted");
    }
    
    // Check for unit times
    if (xml.includes('<UnitEnRoute>2025-05-04T15:42:10.123Z</UnitEnRoute>')) {
      console.log("✅ SUCCESS: Unit time data correctly included");
    } else {
      console.warn("⚠️ WARNING: Unit time data may not be correctly included");
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
main();