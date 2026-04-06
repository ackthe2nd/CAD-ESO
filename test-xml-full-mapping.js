/**
 * Test script to generate XML with full field mapping
 * This script demonstrates all possible fields that can be mapped from Resgrid to ESO
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator');

// Create sample data with all possible fields from the ESO mapping
const completeCallData = {
  // Basic call information (required fields)
  CallId: '98765',
  Timestamp: new Date().toISOString(),
  Nature: 'VEHICLE ACCIDENT WITH INJURIES',
  Address: '456 Oak Street, Anytown, TX 75001',
  UnitsCsv: 'Engine 1, Ladder 5, Rescue 3, Battalion 2',
  Notes: 'Multi-vehicle accident with reported entrapment. Three patients with unknown injuries. Police on scene.',
  
  // Detailed address information
  IncidentAddress1: '456 Oak Street',
  IncidentAddress2: 'Intersection of Oak and Pine',
  City: 'Anytown',
  County: 'Smith County',
  State: 'TX',
  Zip: '75001',
  
  // Destination information
  DestinationName: 'Anytown Memorial Hospital',
  
  // Priority and location information
  Priority: 'High',
  GeoLocation: '32.7566,-96.4213',
  CrossStreet: 'Oak Street & Pine Avenue',
  MapPage: 'Map Grid E4, Page 15',
  
  // Reporting information
  ReportingParty: 'Officer John Smith (PD)',
  ReportingPhone: '555-123-9876',
  
  // Call metadata
  RunNumber: '54321',
  CallStatus: 'Active',
  Driver: 'FF Michael Johnson',
  
  // Timestamps
  TransferOfPatientTime: new Date(Date.now() + 45*60*1000).toISOString(), // 45 minutes from now
  DispatchClosedTime: new Date(Date.now() + 120*60*1000).toISOString(), // 2 hours from now
  UnitNotifiedTime: new Date(Date.now() - 5*60*1000).toISOString(), // 5 minutes ago
  UnitEnRouteTime: new Date(Date.now() - 4*60*1000).toISOString(), // 4 minutes ago
  UnitArrivedTime: new Date(Date.now() - 2*60*1000).toISOString() // 2 minutes ago
};

// Generate XML and output to file
try {
  console.log(`Generating XML for Call ID: ${completeCallData.CallId} with complete field mapping`);
  
  // Generate XML with complete data
  const xmlData = generateXML(completeCallData);
  
  // Save to file
  const outputPath = path.join('.', 'eso-complete-mapping-example.xml');
  fs.writeFileSync(outputPath, xmlData);
  
  console.log('\n--------- COMPLETE XML FIELD MAPPING ---------\n');
  console.log(xmlData);
  console.log('\n----------------------------------------------\n');
  console.log(`Example XML with all possible mapped fields saved to: ${outputPath}`);
  
} catch (error) {
  console.error(`Error generating XML: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}