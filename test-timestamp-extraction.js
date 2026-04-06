/**
 * Test Timestamp Extraction for IncidentOrOnset and DispatchNotified
 * Verifies the timestamp fields are properly populated
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator');

/**
 * Test cases for timestamp extraction
 */
const testCases = [
  {
    name: "Call with LoggedOn field",
    callData: {
      CallId: "TEST001",
      Name: "Test Call 1",
      LoggedOn: "2025-06-07T17:02:47.423Z",
      Address: "123 Main St",
      Priority: 1,
      Nature: "Medical Emergency"
    },
    extraData: { Name: "Test Call 1" }
  },
  {
    name: "Call with LoggedOnUtc field",
    callData: {
      CallId: "TEST002", 
      Name: "Test Call 2",
      LoggedOnUtc: "2025-06-07T17:05:30.123Z",
      Address: "456 Oak Ave",
      Priority: 1,
      Nature: "Fire Emergency"
    },
    extraData: { Name: "Test Call 2" }
  },
  {
    name: "Call with DispatchedOn field",
    callData: {
      CallId: "TEST003",
      Name: "Test Call 3", 
      DispatchedOn: "2025-06-07T17:10:15.789Z",
      Address: "789 Pine St",
      Priority: 2,
      Nature: "General Emergency"
    },
    extraData: { Name: "Test Call 3" }
  },
  {
    name: "Call with no timestamp (should use fallback)",
    callData: {
      CallId: "TEST004",
      Name: "Test Call 4",
      Address: "101 Elm St",
      Priority: 3,
      Nature: "Other Emergency"
    },
    extraData: { 
      Name: "Test Call 4",
      Data: { CreatedOn: "2025-06-07T17:15:45.456Z" }
    }
  },
  {
    name: "Call with completely empty timestamps (should use current time)",
    callData: {
      CallId: "TEST005",
      Name: "Test Call 5", 
      Address: "202 Maple Dr",
      Priority: 1,
      Nature: "Medical Emergency"
    },
    extraData: { Name: "Test Call 5" }
  }
];

/**
 * Run timestamp extraction tests
 */
async function runTimestampTests() {
  console.log('Testing Timestamp Extraction for IncidentOrOnset and DispatchNotified...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const xmlResult = await generateXML(testCase.callData, testCase.extraData, true);
      const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
      
      // Extract timestamp fields from XML
      const incidentOnsetMatch = xml.match(/<IncidentOrOnset>(.*?)<\/IncidentOrOnset>/);
      const dispatchNotifiedMatch = xml.match(/<DispatchNotified>(.*?)<\/DispatchNotified>/);
      
      const incidentOnset = incidentOnsetMatch ? incidentOnsetMatch[1] : 'NOT FOUND';
      const dispatchNotified = dispatchNotifiedMatch ? dispatchNotifiedMatch[1] : 'NOT FOUND';
      
      console.log(`  IncidentOrOnset: ${incidentOnset}`);
      console.log(`  DispatchNotified: ${dispatchNotified}`);
      
      if (incidentOnset && incidentOnset !== '' && incidentOnset !== 'NOT FOUND' &&
          dispatchNotified && dispatchNotified !== '' && dispatchNotified !== 'NOT FOUND') {
        console.log('  ✓ Timestamps properly populated');
      } else {
        console.log('  ✗ Missing timestamp data');
      }
      
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('Timestamp extraction tests completed!');
}

// Run the tests
runTimestampTests().catch(console.error);