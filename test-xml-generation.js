const { generateXML } = require('./src/xml-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Test XML generation with a complete sample call
 */
async function testXmlGeneration() {
  console.log('Testing XML generation...');
  
  // Create a sample call object with all necessary fields
  const sampleCall = {
    CallId: '12345',
    Timestamp: new Date().toISOString(),
    Nature: 'TEST CALL - Medical Emergency',
    Address: '123 Test Street, Test City, TX',
    UnitsCsv: 'Engine 1, Medic 2, Battalion 3',
    Notes: 'This is a test call. Patient complaining of chest pain. BP 120/80, HR 90, SpO2 98%.'
  };
  
  console.log('Sample call data:', JSON.stringify(sampleCall, null, 2));
  
  try {
    // Generate the XML
    const xmlData = generateXML(sampleCall);
    console.log('Generated XML:');
    console.log(xmlData);
    
    // Save to a test file
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `test_call_${Date.now()}.xml`);
    fs.writeFileSync(filePath, xmlData);
    
    console.log(`XML file saved to: ${filePath}`);
    console.log('XML generation test completed successfully');
    
    return true;
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Run the test
testXmlGeneration();