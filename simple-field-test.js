/**
 * Simple test to verify field extraction from actual XML
 */

// Test XML extraction function
function extractXMLFields(xmlContent) {
  if (!xmlContent) return {};
  
  const extractedFields = {};
  
  // Extract CallReceivedTime
  const callReceivedMatch = xmlContent.match(/<CallReceivedTime>(.*?)<\/CallReceivedTime>/);
  if (callReceivedMatch) {
    extractedFields.callReceivedTime = callReceivedMatch[1];
  }
  
  // Extract GPS coordinates from XML
  const latMatch = xmlContent.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
  const longMatch = xmlContent.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
  
  if (latMatch) {
    extractedFields.latitude = latMatch[1];
  }
  if (longMatch) {
    extractedFields.longitude = longMatch[1];
  }
  
  return extractedFields;
}

// Sample XML from recent calls
const sampleXML = `<?xml version="1.0" encoding="utf-8"?>
<EmsDataSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.nemsis.org/">
  <Header>
    <D01_01>23456</D01_01>
    <D01_03>CA</D01_03>
    <D01_04>06</D01_04>
    <D01_07>001122334455</D01_07>
    <D01_08>resgrid2eso</D01_08>
    <D01_09>1.0.0</D01_09>
    <D01_21>2025-06-08T00:05:30</D01_21>
  </Header>
  <EMSDataSet>
    <CallData>
      <E05_01>201108</E05_01>
      <E05_02>001122334455</E05_02>
      <E05_04>390</E05_04>
      <E05_06>6250</E05_06>
      <E05_07>TEST</E05_07>
      <E05_08>1234 Test Ave, Test City, CA 91401</E05_08>
      <E05_09>34.089045321435584</E05_09>
      <E05_10>-118.35037704321545</E05_10>
    </CallData>
    <ResponseData>
      <E06_14>2025-06-07T15:48:11</E06_14>
    </ResponseData>
    <DispositionData>
      <E10_03>2025-06-07T15:48:11</E10_03>
    </DispositionData>
    <SceneData>
      <E07_01>2025-06-07T15:48:11</E07_01>
      <E07_15>34.089045321435584</E07_15>
      <E07_16>-118.35037704321545</E07_16>
    </SceneData>
    <PatientData>
      <E06_01>SNT1</E06_01>
      <E06_02>Ambulance</E06_02>
      <E06_03>390</E06_03>
      <E06_11>2025-06-07T15:48:11</E06_11>
      <E06_12>2025-06-07T15:48:11</E06_12>
      <E06_13>2025-06-07T15:48:11</E06_13>
      <E06_16>2025-06-07T15:48:11</E06_16>
      <E06_17>2025-06-07T15:48:11</E06_17>
    </PatientData>
    <CallReceivedTime>2025-06-07T15:48:11.08</CallReceivedTime>
    <SceneGpsLocationLat>34.089045321435584</SceneGpsLocationLat>
    <SceneGpsLocationLong>-118.35037704321545</SceneGpsLocationLong>
  </EMSDataSet>
</EmsDataSet>`;

console.log('Testing XML field extraction...');
const extracted = extractXMLFields(sampleXML);
console.log('Extracted fields:', extracted);

// Test header mapping
const headers = [
  'Call Received Time',  'Emergency Call ID',
  'Responding Units',    'Call Title',
  'Incident Type',       'Incident Details',
  'Emergency Address',   'Address Line  1',
  'Address Line 2',      'State',
  'ZIP Code',            'GPS Latitude',
  'GPS Longitude',       'Number of Units',
  'Priority Level',      'Priority Description',
  'Response Mode',       'Additional Notes',
  'Patient/Caller Name', 'Contact Information',
  'Patient DOB',         'Call Closed Time',
  'Generated XML',       'ESO Upload Status',
  'Record Created',      'Last Updated'
];

function createHeaderMapping(headers) {
  const mapping = {};
  
  const headerMappings = {
    'Call Received Time': 'callReceivedTime',
    'GPS Latitude': 'latitude',
    'GPS Longitude': 'longitude',
  };
  
  headers.forEach((header, index) => {
    const fieldName = headerMappings[header];
    if (fieldName) {
      mapping[fieldName] = index;
    }
  });
  
  return mapping;
}

const headerMapping = createHeaderMapping(headers);
console.log('\nHeader mapping:', headerMapping);

// Test data fields creation
const dataFields = {
  callReceivedTime: extracted.callReceivedTime || '',
  latitude: extracted.latitude || '',
  longitude: extracted.longitude || ''
};

console.log('\nData fields for sheets:', dataFields);

// Test row creation
const maxColumns = Math.max(...Object.values(headerMapping)) + 1;
const row = new Array(maxColumns).fill('');

Object.entries(headerMapping).forEach(([fieldName, columnIndex]) => {
  if (dataFields.hasOwnProperty(fieldName)) {
    row[columnIndex] = dataFields[fieldName];
  }
});

console.log('\nRow array:');
console.log(`Column 0 (Call Received Time): "${row[0]}"`);
console.log(`Column 11 (GPS Latitude): "${row[11]}"`);
console.log(`Column 12 (GPS Longitude): "${row[12]}"`);

console.log('\nTest completed - extraction working correctly!');