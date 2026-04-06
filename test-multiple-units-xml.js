/**
 * Test script for multiple units XML generation
 * This script tests the new nested Units structure for calls with multiple units
 */

const { generateXML } = require('./src/xml-generator');

// Mock call data with multiple units
const mockCallData = {
  CallId: "198872",
  LoggedOn: "2025-05-10T01:10:55.457",
  Name: "ANOTHER TEST",
  Nature: "nature of the call",
  Note: "Additional notes about the call",
  Address: "5846 Painted Pony Cir, Simi Valley, CA 93063, USA",
  Type: "Medical",
  ContactName: "John Doe",
  ContactInfo: "555-123-4567",
  ExternalId: "1985-03-15",
  Priority: { Id: 1560 },
  Latitude: "34.19723919812224",
  Longitude: "-118.4624331406047"
};

const mockExtraData = {
  Data: {
    Dispatches: [
      {
        Type: "Unit",
        Name: "STN1",
        Location: "34.197,-118.462",
        EnRouteTime: "2025-05-10T02:21:27.85",
        ArrivedTime: "2025-05-10T02:24:11.493"
      },
      {
        Type: "Unit", 
        Name: "BLS11",
        Location: "34.197,-118.462",
        EnRouteTime: "2025-05-10T02:21:27.85",
        ArrivedTime: "2025-05-10T02:24:11.493"
      }
    ],
    Activity: [
      {
        Type: "Unit",
        Name: "STN1",
        StatusId: 5,
        StatusText: "En Route",
        Timestamp: "2025-05-10T02:21:27.85"
      },
      {
        Type: "Unit",
        Name: "STN1", 
        StatusId: 6,
        StatusText: "On Scene",
        Timestamp: "2025-05-10T02:24:11.493"
      },
      {
        Type: "Unit",
        Name: "BLS11",
        StatusId: 5,
        StatusText: "En Route", 
        Timestamp: "2025-05-10T02:21:27.85"
      },
      {
        Type: "Unit",
        Name: "BLS11",
        StatusId: 6,
        StatusText: "On Scene",
        Timestamp: "2025-05-10T02:24:11.493"
      }
    ]
  }
};

// Test single unit (should use flat structure)
const singleUnitExtraData = {
  Data: {
    Dispatches: [
      {
        Type: "Unit",
        Name: "STN1",
        Location: "34.197,-118.462",
        EnRouteTime: "2025-05-10T02:21:27.85",
        ArrivedTime: "2025-05-10T02:24:11.493"
      }
    ]
  }
};

console.log("Testing Multiple Units XML Generation\n");
console.log("=====================================\n");

console.log("1. Testing MULTIPLE UNITS (should use nested Units structure):");
console.log("----------------------------------------------------------------");
const multipleUnitsXml = generateXML(mockCallData, mockExtraData, true);
console.log(multipleUnitsXml);

console.log("\n\n2. Testing SINGLE UNIT (should use flat structure):");
console.log("----------------------------------------------------");
const singleUnitXml = generateXML(mockCallData, singleUnitExtraData, true);
console.log(singleUnitXml);

console.log("\n\n3. Validation:");
console.log("---------------");

// Check if multiple units XML contains Units wrapper
const hasUnitsWrapper = multipleUnitsXml.includes('<Units>') && multipleUnitsXml.includes('</Units>');
console.log(`Multiple units XML has Units wrapper: ${hasUnitsWrapper}`);

// Check if multiple units XML contains multiple Unit elements
const unitMatches = multipleUnitsXml.match(/<Unit>/g);
const unitCount = unitMatches ? unitMatches.length : 0;
console.log(`Multiple units XML contains ${unitCount} Unit elements`);

// Check if single unit XML uses flat structure
const singleHasUnitsWrapper = singleUnitXml.includes('<Units>');
const singleHasEmsUnitCallSign = singleUnitXml.includes('<EmsUnitCallSign>');
console.log(`Single unit XML uses flat structure (no Units wrapper): ${!singleHasUnitsWrapper}`);
console.log(`Single unit XML has EmsUnitCallSign: ${singleHasEmsUnitCallSign}`);

// Check for expected unit names
const stn1InMultiple = multipleUnitsXml.includes('<EmsUnitCallSign>STN1</EmsUnitCallSign>');
const bls11InMultiple = multipleUnitsXml.includes('<EmsUnitCallSign>BLS11</EmsUnitCallSign>');
console.log(`Multiple units XML contains STN1: ${stn1InMultiple}`);
console.log(`Multiple units XML contains BLS11: ${bls11InMultiple}`);

console.log("\nTest completed successfully!");