/**
 * Direct XML builder test
 */
const fs = require('fs');
const xmlbuilder2 = require('xmlbuilder2');

// Create a very basic XML document
const doc = xmlbuilder2.create({ version: '1.0', encoding: 'utf-8' })
  .ele('root')
    .ele('child').txt('text1').up()
    .ele('child').txt('text2').up()
  .up();

// Output the XML
const xml = doc.end({ prettyPrint: true });
console.log('XML output:');
console.log(xml);

// Save to file
fs.writeFileSync('logs/basic_xml_test.xml', xml);

// Now try the raw approach
const raw = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>
  <IncidentNumber>TEST123</IncidentNumber>
  <IncidentAddress1>123 Test St, Test City, CA 12345</IncidentAddress1>
  <IncidentCity>Test City</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>12345</IncidentZip>
</CadIncident>`;

fs.writeFileSync('logs/raw_xml_test.xml', raw);
console.log('\nRaw XML saved to logs/raw_xml_test.xml');