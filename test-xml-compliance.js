/**
 * Test XML Compliance After Fixes
 * Generates sample XML to verify namespace and element formatting
 */

const { generateXML } = require('./src/xml-generator');

// Sample call data for testing
const testCallData = {
  CallId: 'TEST999',
  Name: 'XML Compliance Test',
  Nature: 'Test Call',
  Note: 'Testing XML compliance fixes',
  Address: '123 Test St, Test City, CA 90210',
  Geolocation: '34.0522,-118.2437',
  LoggedOn: '2025-06-09T06:00:00.000',
  State: 0,
  Priority: { Id: 3 }
};

const testExtraData = {
  Data: {
    Dispatches: [
      {
        Name: 'TEST1',
        DispatchedOn: '2025-06-09T06:01:00.000'
      }
    ],
    Activity: []
  }
};

async function testXMLCompliance() {
  console.log('🧪 Testing XML compliance after fixes...\n');
  
  try {
    const xmlResult = await generateXML(testCallData, testExtraData, true);
    const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    console.log('Generated XML:');
    console.log('=' * 50);
    console.log(xml);
    console.log('=' * 50);
    
    // Check for compliance issues
    const issues = [];
    
    // Check namespace attribute syntax
    if (xml.includes('xmlns_xsi=')) {
      issues.push('❌ Found incorrect namespace syntax: xmlns_xsi (should be xmlns:xsi)');
    } else if (xml.includes('xmlns:xsi=')) {
      console.log('✅ Namespace attribute syntax correct: xmlns:xsi');
    }
    
    // Check for empty elements
    const emptyElements = xml.match(/<(\w+)><\/\1>/g);
    if (emptyElements) {
      console.log(`⚠️  Found ${emptyElements.length} empty elements: ${emptyElements.join(', ')}`);
      console.log('   (These are valid but may cause issues with strict validators)');
    } else {
      console.log('✅ No problematic empty elements found');
    }
    
    // Check XML structure
    if (xml.includes('<CadIncident') && xml.includes('</CadIncident>')) {
      console.log('✅ XML structure appears valid');
    } else {
      issues.push('❌ XML structure appears invalid');
    }
    
    if (issues.length === 0) {
      console.log('\n🎉 XML compliance test PASSED - All fixes verified!');
    } else {
      console.log('\n❌ XML compliance issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ XML generation failed:', error.message);
  }
}

// Run test
testXMLCompliance();