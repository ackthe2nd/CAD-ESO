/**
 * Verify Google Sheets Data - Check Call Received Time and GPS coordinates
 */
require('dotenv').config();
const { google } = require('googleapis');

async function verifyGoogleSheetsData() {
  try {
    console.log('Verifying Google Sheets data for Call Received Time and GPS coordinates...');
    
    // Initialize Google Sheets API
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not found');
    }
    
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get call data from the correct sheet/tab
    console.log('Checking for call data sheet...');
    
    // First get sheet info to find the correct tab
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('Available sheets:', sheetInfo.data.sheets.map(s => s.properties.title));
    
    // Try to find the call data sheet
    let callDataSheet = 'Call Data'; // Default name
    const callSheet = sheetInfo.data.sheets.find(s => 
      s.properties.title.toLowerCase().includes('call') && 
      !s.properties.title.toLowerCase().includes('log')
    );
    
    if (callSheet) {
      callDataSheet = callSheet.properties.title;
      console.log(`Using call data sheet: ${callDataSheet}`);
    }
    
    // Get all data from the call data sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${callDataSheet}!A:Z`, // Get all columns from call data sheet
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in Google Sheets');
      return;
    }
    
    // Find header row
    const headers = rows[0];
    console.log('Available columns:', headers);
    
    // Find relevant column indices based on your headers
    const callReceivedTimeIndex = headers.findIndex(h => h && h.toLowerCase().includes('call received time'));
    const callIdIndex = headers.findIndex(h => h && h.toLowerCase().includes('emergency call id'));
    const xmlIndex = headers.findIndex(h => h && h.toLowerCase().includes('generated xml'));
    const gpsLatIndex = headers.findIndex(h => h && h.toLowerCase().includes('gps latitude'));
    const gpsLongIndex = headers.findIndex(h => h && h.toLowerCase().includes('gps longitude'));
    const timestampIndex = headers.findIndex(h => h && h.toLowerCase().includes('record created'));
    
    console.log(`\nColumn indices:`);
    console.log(`Call Received Time: ${callReceivedTimeIndex}`);
    console.log(`Emergency Call ID: ${callIdIndex}`);
    console.log(`Generated XML: ${xmlIndex}`);
    console.log(`GPS Latitude: ${gpsLatIndex}`);
    console.log(`GPS Longitude: ${gpsLongIndex}`);
    console.log(`Record Created: ${timestampIndex}`);
    
    // Check recent call entries
    console.log('\nRecent call entries:');
    const dataRows = rows.slice(1); // Skip header row
    const recentRows = dataRows.slice(-10); // Last 10 data rows
    
    recentRows.forEach((row, index) => {
      if (row[callIdIndex] && row[callIdIndex].startsWith('2011')) {
        console.log(`\nCall ${row[callIdIndex]}:`);
        console.log(`  Record Created: ${row[timestampIndex] || 'N/A'}`);
        console.log(`  Call Received Time: ${row[callReceivedTimeIndex] || 'N/A'}`);
        console.log(`  GPS Latitude: ${row[gpsLatIndex] || 'N/A'}`);
        console.log(`  GPS Longitude: ${row[gpsLongIndex] || 'N/A'}`);
        
        if (row[xmlIndex]) {
          const xmlContent = row[xmlIndex];
          console.log(`  Generated XML Length: ${xmlContent.length}`);
          
          // Check for Call Received Time in XML
          const hasCallReceivedTime = xmlContent.includes('<CallReceivedTime>');
          console.log(`  XML has CallReceivedTime tag: ${hasCallReceivedTime}`);
          
          if (hasCallReceivedTime) {
            const callReceivedMatch = xmlContent.match(/<CallReceivedTime>(.*?)<\/CallReceivedTime>/);
            if (callReceivedMatch) {
              console.log(`  CallReceivedTime value in XML: ${callReceivedMatch[1]}`);
            }
          }
          
          // Check for GPS coordinates in XML
          const hasLat = xmlContent.includes('<SceneGpsLocationLat>');
          const hasLong = xmlContent.includes('<SceneGpsLocationLong>');
          console.log(`  XML has GPS Latitude tag: ${hasLat}`);
          console.log(`  XML has GPS Longitude tag: ${hasLong}`);
          
          if (hasLat) {
            const latMatch = xmlContent.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
            if (latMatch) {
              console.log(`  GPS Latitude value in XML: ${latMatch[1] || 'Empty'}`);
            }
          }
          
          if (hasLong) {
            const longMatch = xmlContent.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
            if (longMatch) {
              console.log(`  GPS Longitude value in XML: ${longMatch[1] || 'Empty'}`);
            }
          }
        } else {
          console.log(`  Generated XML: Missing or empty`);
        }
      }
    });
    
  } catch (error) {
    console.error('Error verifying Google Sheets data:', error);
  }
}

verifyGoogleSheetsData();