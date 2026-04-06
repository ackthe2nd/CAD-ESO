/**
 * Verify Incident Type column values in Google Sheets
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyIncidentType() {
  console.log('Verifying Incident Type values in Google Sheets...');
  
  try {
    // Initialize Google Sheets auth
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });
    
    const headers = headersResponse.data.values[0];
    console.log('Available headers:', headers);
    
    // Find column indices
    const callIdIndex = headers.indexOf('Emergency Call ID');
    const incidentTypeIndex = headers.indexOf('Incident Type');
    const callTitleIndex = headers.indexOf('Call Title');
    const recordCreatedIndex = headers.indexOf('Record Created');
    
    console.log(`Column indices - Call ID: ${callIdIndex}, Incident Type: ${incidentTypeIndex}, Call Title: ${callTitleIndex}`);
    
    // Get recent data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!2:20'
    });
    
    const rows = dataResponse.data.values || [];
    
    console.log('\nRecent call data:');
    rows.forEach((row, index) => {
      if (row[callIdIndex] && ['201108', '201105', '201104'].includes(row[callIdIndex])) {
        console.log(`\nCall ${row[callIdIndex]}:`);
        console.log(`  Call Title: ${row[callTitleIndex] || 'N/A'}`);
        console.log(`  Incident Type: ${row[incidentTypeIndex] || 'N/A'}`);
        console.log(`  Record Created: ${row[recordCreatedIndex] || 'N/A'}`);
        
        // Check if this is the CAD call that should show "Medical Emergency"
        if (row[callIdIndex] === '201104') {
          if (row[incidentTypeIndex] === 'Medical Emergency') {
            console.log('  ✅ CAD call correctly shows "Medical Emergency"');
          } else {
            console.log(`  ❌ CAD call shows "${row[incidentTypeIndex] || 'N/A'}" instead of "Medical Emergency"`);
          }
        }
        
        // Check if this is the form call that should show "Medical Emergency"
        if (row[callIdIndex] === '201105') {
          if (row[incidentTypeIndex] === 'Medical Emergency') {
            console.log('  ✅ Form call correctly shows "Medical Emergency"');
          } else {
            console.log(`  ❌ Form call shows "${row[incidentTypeIndex] || 'N/A'}" instead of "Medical Emergency"`);
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error verifying incident type:', error.message);
  }
}

verifyIncidentType();