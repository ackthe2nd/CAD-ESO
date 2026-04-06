/**
 * Debug Google Sheets Column Structure
 * Check actual column positions and header mapping
 */

require('dotenv').config();
const { google } = require('googleapis');

async function debugColumnStructure() {
  console.log('Debugging Google Sheets Column Structure');
  console.log('========================================');
  
  try {
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers from A1 to AZ1 to see the complete structure
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ1',
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    
    console.log('\nComplete Header Structure:');
    console.log('Index | Column | Header Name');
    console.log('------|--------|------------');
    
    for (let i = 0; i < headers.length; i++) {
      const columnLetter = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
      console.log(`${i.toString().padStart(5)} | ${columnLetter.padStart(6)} | ${headers[i] || 'EMPTY'}`);
    }
    
    // Find specific columns
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    const testCallIndex = headers.findIndex(h => h === 'Test Call');
    const incidentTypeIndex = headers.findIndex(h => h === 'Incident Type');
    
    console.log('\nKey Column Positions:');
    console.log(`Emergency Call ID: Index ${callIdIndex}, Column ${callIdIndex >= 0 ? (callIdIndex < 26 ? String.fromCharCode(65 + callIdIndex) : 'AA+') : 'NOT FOUND'}`);
    console.log(`Test Result: Index ${testResultIndex}, Column ${testResultIndex >= 0 ? (testResultIndex < 26 ? String.fromCharCode(65 + testResultIndex) : 'AA+') : 'NOT FOUND'}`);
    console.log(`Test Call: Index ${testCallIndex}, Column ${testCallIndex >= 0 ? (testCallIndex < 26 ? String.fromCharCode(65 + testCallIndex) : 'AA+') : 'NOT FOUND'}`);
    console.log(`Incident Type: Index ${incidentTypeIndex}, Column ${incidentTypeIndex >= 0 ? (incidentTypeIndex < 26 ? String.fromCharCode(65 + incidentTypeIndex) : 'AA+') : 'NOT FOUND'}`);
    
    // Check actual data in recent rows to see what's in Test Result vs Incident Type
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A2:AZ10',
    });
    
    const data = dataResponse.data.values || [];
    
    console.log('\nRecent Data Analysis:');
    console.log('Row | Call ID | Test Result Column Content | Incident Type Column Content');
    console.log('----|---------|----------------------------|-----------------------------');
    
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const row = data[i] || [];
      const callId = row[callIdIndex] || '';
      const testResultContent = testResultIndex >= 0 ? (row[testResultIndex] || '') : 'N/A';
      const incidentTypeContent = incidentTypeIndex >= 0 ? (row[incidentTypeIndex] || '') : 'N/A';
      
      console.log(`${(i + 2).toString().padStart(3)} | ${callId.padStart(7)} | ${testResultContent.substring(0, 25).padEnd(25)} | ${incidentTypeContent.substring(0, 25)}`);
    }
    
    // Test column letter calculation
    console.log('\nColumn Letter Calculation Test:');
    for (let testIndex of [5, 6, 36, 37]) {
      const calculatedColumn = testIndex < 26 ? String.fromCharCode(65 + testIndex) : 'COMPLEX';
      console.log(`Index ${testIndex} -> Column ${calculatedColumn}`);
    }
    
  } catch (error) {
    console.error('Error debugging column structure:', error.message);
  }
}

async function main() {
  await debugColumnStructure();
}

main().catch(console.error);