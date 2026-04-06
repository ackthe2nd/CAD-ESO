/**
 * Test script to verify unit filtering functionality
 * This script tests that units are properly filtered by:
 * 1. Type='Unit'
 * 2. Name is alphanumeric
 * 3. Name is less than 9 characters
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import XML generator
const { generateXML } = require('./src/xml-generator');

// Enable debug mode to see more details
const DEBUG = true;

// Set up logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

// Create mock call data with various unit configurations
function createMockCallWithUnits() {
  const callId = '12345';
  const callData = {
    Data: {
      CallId: callId,
      Priority: 1560,
      Name: 'Test Call with Units',
      Nature: 'Test call for unit filtering',
      Note: 'Test Note',
      Address: '123 Test St, Testville, CA 12345',
      Geolocation: '34.1,-118.4',
      LoggedOn: '2025-05-06T10:00:00',
      State: 0,
      Number: '25-XX',
      ContactName: 'TEST USER',
      ContactInfo: '(555) 555-5555',
      Type: 'Test Type',
      LoggedOnUtc: '2025-05-06T17:00:00',
      UnitsCsv: 'UNIT1,STN_2,TOO-LONG-UNIT-NAME,1234567890,Unit@Special'
    }
  };

  const extraCallData = {
    Data: {
      CallFormData: 'Test Form Data',
      Activity: [],
      Dispatches: [
        // Valid unit (Type=Unit, alphanumeric, < 9 chars)
        {
          Id: 'ID1',
          Type: 'Unit',
          Name: 'VALIDUNIT',
          GroupId: '123',
          Group: 'Test Group'
        },
        // Invalid - not a Unit
        {
          Id: 'ID2',
          Type: 'User',
          Name: 'USERTYPE',
          GroupId: '123',
          Group: 'Test Group'
        },
        // Invalid - too long
        {
          Id: 'ID3',
          Type: 'Unit',
          Name: 'TOOLONGUNIT123',
          GroupId: '123',
          Group: 'Test Group'
        },
        // Invalid - non-alphanumeric
        {
          Id: 'ID4',
          Type: 'Unit',
          Name: 'UNIT-1',
          GroupId: '123',
          Group: 'Test Group'
        }
      ],
      Priority: {
        Id: 1560,
        Name: 'Emergent',
        Color: '#ff0000'
      }
    }
  };

  return { callData, extraCallData };
}

/**
 * Test the unit filtering logic
 */
function testUnitFiltering() {
  log('Testing unit filtering logic');

  // Test case 1: No valid units in UnitsCsv, one valid unit in Dispatches
  log('Test case 1: No valid units in UnitsCsv, one valid unit in Dispatches');
  const mockData1 = createMockCallWithUnits();
  mockData1.callData.Data.UnitsCsv = 'TOO-LONG-UNIT-NAME,1234567890,Unit@Special';
  
  // Debug the dispatch units
  log('Debug - Dispatches:');
  mockData1.extraCallData.Data.Dispatches.forEach(d => {
    log(`  Type: ${d.Type}, Name: ${d.Name}, Valid: ${d.Type === 'Unit' && d.Name && d.Name.length <= 9 && /^[a-zA-Z0-9]+$/.test(d.Name)}`);
  });
  
  const xml1 = generateXML(mockData1.callData.Data, mockData1.extraCallData.Data, true); // Enable debug
  const expectedUnit1 = 'VALIDUNIT';
  if (xml1.includes(`<EmsUnitCallSign>${expectedUnit1}</EmsUnitCallSign>`)) {
    log(`✓ Successfully selected unit ${expectedUnit1} from Dispatches array`);
  } else {
    log(`✗ Failed to select expected unit ${expectedUnit1}`, true);
    log(`Generated XML: ${xml1}`, true);
  }

  // Test case 2: Valid unit in UnitsCsv
  log('Test case 2: Valid unit in UnitsCsv');
  const mockData2 = createMockCallWithUnits();
  mockData2.callData.Data.UnitsCsv = 'UNIT1,TOO-LONG-UNIT-NAME';
  const xml2 = generateXML(mockData2.callData.Data, mockData2.extraCallData.Data);
  const expectedUnit2 = 'UNIT1';
  if (xml2.includes(`<EmsUnitCallSign>${expectedUnit2}</EmsUnitCallSign>`)) {
    log(`✓ Successfully selected unit ${expectedUnit2} from UnitsCsv`);
  } else {
    log(`✗ Failed to select expected unit ${expectedUnit2}`, true);
    log(`Generated XML: ${xml2}`, true);
  }

  // Test case 3: No valid units at all
  log('Test case 3: No valid units at all');
  const mockData3 = createMockCallWithUnits();
  mockData3.callData.Data.UnitsCsv = 'TOO-LONG-UNIT-NAME,1234567890,Unit@Special';
  mockData3.extraCallData.Data.Dispatches = [
    {
      Id: 'ID1',
      Type: 'User',
      Name: 'NotAUnit',
      GroupId: '123',
      Group: 'Test Group'
    },
    {
      Id: 'ID2',
      Type: 'Unit',
      Name: 'TOO-LONG-UNIT-NAME',
      GroupId: '123',
      Group: 'Test Group'
    }
  ];
  const xml3 = generateXML(mockData3.callData.Data, mockData3.extraCallData.Data);
  if (xml3.includes('<EmsUnitCallSign></EmsUnitCallSign>')) {
    log('✓ Successfully handled case with no valid units');
  } else {
    log('✗ Failed to handle case with no valid units correctly', true);
    log(`Generated XML: ${xml3}`, true);
  }

  log('Unit filtering tests completed');
}

/**
 * Main function to run tests
 */
async function main() {
  try {
    log('Starting unit filtering tests');
    testUnitFiltering();
    log('All tests completed');
  } catch (error) {
    log(`Test failed with error: ${error.message}`, true);
    console.error(error);
  }
}

// Run tests
main();