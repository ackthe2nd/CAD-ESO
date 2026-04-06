/**
 * Test CallNatureDescription removal from XML generation
 * Verify only CallNature remains in the output
 */

const { generateXML } = require('./src/xml-generator');

// Test data for single unit
const singleUnitCall = {
  CallId: "TEST-SINGLE",
  LoggedOn: "2025-06-03T09:24:00.000Z",
  Name: "Medical Emergency",
  Nature: "Patient experiencing chest pain",
  Note: "Additional details about the emergency",
  Address: "123 Main St, Anytown, CA 90210, USA",
  Type: "Medical",
  Priority: { Id: 1560 },
  Latitude: "34.0522",
  Longitude: "-118.2437"
};

const singleUnitExtra = {
  Data: {
    Dispatches: [
      { Type: "Unit", Name: "AMB1" }
    ]
  }
};

// Test data for multiple units
const multiUnitCall = {
  CallId: "TEST-MULTI",
  LoggedOn: "2025-06-03T09:24:00.000Z",
  Name: "Structure Fire",
  Nature: "House fire with possible entrapment",
  Note: "Multiple units responding",
  Address: "456 Fire St, Emergency City, CA 90210, USA",
  Type: "Fire",
  Priority: { Id: 1560 },
  Latitude: "34.0522",
  Longitude: "-118.2437"
};

const multiUnitExtra = {
  Data: {
    Dispatches: [
      { Type: "Unit", Name: "ENGINE1" },
      { Type: "Unit", Name: "LADDER1" },
      { Type: "Unit", Name: "RESCUE1" }
    ]
  }
};

console.log('Testing CallNatureDescription Removal');
console.log('====================================\n');

console.log('1. Testing Single Unit (flat structure):');
console.log('-----------------------------------------');
const singleXml = generateXML(singleUnitCall, singleUnitExtra);

console.log('Checking for CallNature presence:', singleXml.includes('<CallNature>'));
console.log('Checking for CallNatureDescription presence:', singleXml.includes('<CallNatureDescription>'));
console.log('CallNature content:', singleXml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || 'Not found');

console.log('\n2. Testing Multiple Units (nested structure):');
console.log('----------------------------------------------');
const multiXml = generateXML(multiUnitCall, multiUnitExtra);

console.log('Checking for CallNature presence:', multiXml.includes('<CallNature>'));
console.log('Checking for CallNatureDescription presence:', multiXml.includes('<CallNatureDescription>'));
console.log('CallNature content:', multiXml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || 'Not found');

console.log('\n3. Verification Results:');
console.log('------------------------');
const singleHasCallNature = singleXml.includes('<CallNature>');
const singleHasCallNatureDesc = singleXml.includes('<CallNatureDescription>');
const multiHasCallNature = multiXml.includes('<CallNature>');
const multiHasCallNatureDesc = multiXml.includes('<CallNatureDescription>');

console.log(`Single unit - CallNature present: ${singleHasCallNature ? 'YES' : 'NO'}`);
console.log(`Single unit - CallNatureDescription present: ${singleHasCallNatureDesc ? 'YES (ERROR)' : 'NO (CORRECT)'}`);
console.log(`Multiple units - CallNature present: ${multiHasCallNature ? 'YES' : 'NO'}`);
console.log(`Multiple units - CallNatureDescription present: ${multiHasCallNatureDesc ? 'YES (ERROR)' : 'NO (CORRECT)'}`);

const testPassed = singleHasCallNature && !singleHasCallNatureDesc && 
                   multiHasCallNature && !multiHasCallNatureDesc;

console.log(`\nOverall test result: ${testPassed ? 'PASSED' : 'FAILED'}`);

// Save test outputs
const fs = require('fs');
fs.mkdirSync('test-output', { recursive: true });
fs.writeFileSync('test-output/single-unit-no-description.xml', singleXml);
fs.writeFileSync('test-output/multi-unit-no-description.xml', multiXml);

console.log('\nXML samples saved to test-output/');
console.log('- single-unit-no-description.xml');
console.log('- multi-unit-no-description.xml');

if (testPassed) {
  console.log('\n✓ CallNatureDescription successfully removed from XML generation');
  console.log('✓ CallNature field preserved in both single and multiple unit formats');
} else {
  console.log('\n✗ Test failed - please check XML generation logic');
}