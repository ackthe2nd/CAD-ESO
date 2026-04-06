/**
 * Test XML Format Consistency
 * Verify that both single-unit and multi-unit calls use the same XML structure
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator.js');

async function testXMLFormatConsistency() {
  console.log('Testing XML Format Consistency...\n');
  
  // Mock single unit call data (like call 201079)
  const singleUnitCall = {
    CallId: 'TEST-SINGLE-001',
    LoggedOnUtc: '2025-06-07T20:30:00.000Z',
    Address: '123 Main St, Los Angeles, CA 90210',
    Nature: 'Medical Emergency - Single Unit Test',
    Priority: 1
  };
  
  const singleUnitExtra = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'TEST1',
          UnitId: 1001
        }
      ],
      Activity: []
    }
  };
  
  // Mock multi-unit call data (like call 200893)
  const multiUnitCall = {
    CallId: 'TEST-MULTI-002',
    LoggedOnUtc: '2025-06-07T20:30:00.000Z',
    Address: '456 Oak Ave, Los Angeles, CA 90210',
    Nature: 'Medical Emergency - Multi Unit Test',
    Priority: 1
  };
  
  const multiUnitExtra = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'TEST2',
          UnitId: 2001
        },
        {
          Type: 'Unit',
          Name: 'TEST3',
          UnitId: 2002
        }
      ],
      Activity: []
    }
  };
  
  console.log('Generating XML for single unit call...');
  const singleResult = await generateXML(singleUnitCall, singleUnitExtra, true);
  
  console.log('Generating XML for multi-unit call...');
  const multiResult = await generateXML(multiUnitCall, multiUnitExtra, true);
  
  console.log('\n=== SINGLE UNIT XML STRUCTURE ===');
  console.log(singleResult.xml);
  
  console.log('\n=== MULTI-UNIT XML STRUCTURE ===');
  console.log(multiResult.xml);
  
  // Verify both use the <Units> structure
  const singleHasUnitsTag = singleResult.xml.includes('<Units>');
  const multiHasUnitsTag = multiResult.xml.includes('<Units>');
  const singleHasEmsUnitCallSign = singleResult.xml.includes('<EmsUnitCallSign>') && !singleResult.xml.includes('<Units>');
  
  console.log('\n=== FORMAT CONSISTENCY CHECK ===');
  console.log(`Single unit uses <Units> structure: ${singleHasUnitsTag ? '✅' : '❌'}`);
  console.log(`Multi-unit uses <Units> structure: ${multiHasUnitsTag ? '✅' : '❌'}`);
  console.log(`Single unit avoids flat structure: ${!singleHasEmsUnitCallSign ? '✅' : '❌'}`);
  
  const isConsistent = singleHasUnitsTag && multiHasUnitsTag && !singleHasEmsUnitCallSign;
  
  console.log(`\n🎯 XML Format Consistency: ${isConsistent ? '✅ PASS' : '❌ FAIL'}`);
  
  if (isConsistent) {
    console.log('\n✅ SUCCESS: All calls now use consistent Units XML structure');
    console.log('✅ Single-unit calls: Use <Units><Unit> structure');
    console.log('✅ Multi-unit calls: Use <Units><Unit> structure');
    console.log('✅ Format standardization complete');
  } else {
    console.log('\n❌ ISSUE: XML format inconsistency detected');
    console.log('❌ Need to review xml-generator.js logic');
  }
  
  return isConsistent;
}

// Run the test
testXMLFormatConsistency().catch(console.error);