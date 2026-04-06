/**
 * Check ESO Upload Status column in Google Sheets for call 201192
 */
require('dotenv').config();
const { google } = require('googleapis');

async function checkUploadStatus() {
  try {
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

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get headers
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });

    const headers = headersResponse.data.values ? headersResponse.data.values[0] : [];
    console.log('Headers found:', headers.length);
    
    // Find key column indices
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const uploadStatusIndex = headers.findIndex(h => h === 'ESO Upload Status');
    const generatedXmlIndex = headers.findIndex(h => h === 'Generated XML');
    const recordCreatedIndex = headers.findIndex(h => h === 'Record Created');
    const lastUpdatedIndex = headers.findIndex(h => h === 'Last Updated');

    console.log('\nColumn mapping:');
    console.log(`  Emergency Call ID: Column ${String.fromCharCode(65 + callIdIndex)} (Index: ${callIdIndex})`);
    console.log(`  ESO Upload Status: Column ${String.fromCharCode(65 + uploadStatusIndex)} (Index: ${uploadStatusIndex})`);
    console.log(`  Generated XML: Column ${String.fromCharCode(65 + generatedXmlIndex)} (Index: ${generatedXmlIndex})`);
    console.log(`  Record Created: Column ${String.fromCharCode(65 + recordCreatedIndex)} (Index: ${recordCreatedIndex})`);
    console.log(`  Last Updated: Column ${String.fromCharCode(65 + lastUpdatedIndex)} (Index: ${lastUpdatedIndex})`);

    // Get all call data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:ZZ'
    });

    const rows = dataResponse.data.values || [];
    console.log('\nFinding call 201192...');
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][callIdIndex] === '201192') {
        console.log(`Found call 201192 in row ${i + 1}`);
        console.log(`Row has ${rows[i].length} columns (headers have ${headers.length})`);
        
        console.log('\nUpload Status Analysis:');
        console.log(`  ESO Upload Status (${uploadStatusIndex}): "${rows[i][uploadStatusIndex] || 'EMPTY'}"`);
        console.log(`  Generated XML (${generatedXmlIndex}): "${rows[i][generatedXmlIndex] ? 'HAS XML DATA' : 'EMPTY'}"`);
        console.log(`  Record Created (${recordCreatedIndex}): "${rows[i][recordCreatedIndex] || 'EMPTY'}"`);
        console.log(`  Last Updated (${lastUpdatedIndex}): "${rows[i][lastUpdatedIndex] || 'EMPTY'}"`);
        
        // Show surrounding columns for context
        console.log('\nSurrounding columns:');
        for (let j = Math.max(0, uploadStatusIndex - 2); j <= Math.min(headers.length - 1, uploadStatusIndex + 2); j++) {
          console.log(`  Column ${j} (${String.fromCharCode(65 + j)}): "${rows[i][j] || 'EMPTY'}" - ${headers[j]}`);
        }
        break;
      }
    }

  } catch (error) {
    console.error('Error checking upload status:', error.message);
  }
}

checkUploadStatus();