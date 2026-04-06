/**
 * Debug Google Sheets field mapping and verify data extraction
 */

require('dotenv').config();
const { google } = require('googleapis');

async function debugSheetsMapping() {
  try {
    // Initialize Google Sheets client
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.log('Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
      return;
    }

    const keyFileData = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: keyFileData,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get all data from Call Data sheet
    console.log('Fetching all data from Call Data sheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:Z'
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('No data found in sheet');
      return;
    }

    const headers = rows[0];
    console.log('Headers:', headers);

    // Find column indices
    const callReceivedTimeIndex = headers.findIndex(h => h && h.toLowerCase().includes('call received time'));
    const callIdIndex = headers.findIndex(h => h && h.toLowerCase().includes('emergency call id'));
    const gpsLatIndex = headers.findIndex(h => h && h.toLowerCase().includes('gps latitude'));
    const gpsLongIndex = headers.findIndex(h => h && h.toLowerCase().includes('gps longitude'));

    console.log('\nColumn mapping:');
    console.log(`Call Received Time: column ${callReceivedTimeIndex} (${headers[callReceivedTimeIndex]})`);
    console.log(`Emergency Call ID: column ${callIdIndex} (${headers[callIdIndex]})`);
    console.log(`GPS Latitude: column ${gpsLatIndex} (${headers[gpsLatIndex]})`);
    console.log(`GPS Longitude: column ${gpsLongIndex} (${headers[gpsLongIndex]})`);

    // Check recent rows
    console.log('\nRecent 5 rows:');
    const dataRows = rows.slice(1); // Skip header
    const recentRows = dataRows.slice(-5);
    
    recentRows.forEach((row, index) => {
      if (row[callIdIndex]) {
        console.log(`\nRow ${dataRows.length - 5 + index + 1}: Call ${row[callIdIndex]}`);
        console.log(`  Call Received Time: "${row[callReceivedTimeIndex] || 'EMPTY'}"`);
        console.log(`  GPS Latitude: "${row[gpsLatIndex] || 'EMPTY'}"`);
        console.log(`  GPS Longitude: "${row[gpsLongIndex] || 'EMPTY'}"`);
        
        // Check if there's XML content
        const xmlIndex = headers.findIndex(h => h && h.toLowerCase().includes('generated xml'));
        if (xmlIndex >= 0 && row[xmlIndex]) {
          const xmlContent = row[xmlIndex];
          console.log(`  XML Length: ${xmlContent.length}`);
          
          // Extract from XML to compare
          const callReceivedMatch = xmlContent.match(/<CallReceivedTime>(.*?)<\/CallReceivedTime>/);
          const latMatch = xmlContent.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
          const longMatch = xmlContent.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
          
          if (callReceivedMatch) {
            console.log(`  XML CallReceivedTime: "${callReceivedMatch[1]}"`);
          }
          if (latMatch) {
            console.log(`  XML GPS Lat: "${latMatch[1]}"`);
          }
          if (longMatch) {
            console.log(`  XML GPS Long: "${longMatch[1]}"`);
          }
        }
      }
    });

    // Check if test call 201999 exists
    const testCallRow = dataRows.find(row => row[callIdIndex] === '201999');
    if (testCallRow) {
      console.log('\n*** Test call 201999 found! ***');
      console.log(`Call Received Time: "${testCallRow[callReceivedTimeIndex] || 'EMPTY'}"`);
      console.log(`GPS Latitude: "${testCallRow[gpsLatIndex] || 'EMPTY'}"`);
      console.log(`GPS Longitude: "${testCallRow[gpsLongIndex] || 'EMPTY'}"`);
    } else {
      console.log('\n*** Test call 201999 NOT found ***');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugSheetsMapping();