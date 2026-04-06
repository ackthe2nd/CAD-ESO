/**
 * Verify City Column Implementation
 * Check that the City column is working in Google Sheets for recent calls
 */

const { google } = require('googleapis');

async function verifyCityColumn() {
  try {
    console.log('Verifying City column implementation...');
    
    // Initialize Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const authClient = await auth.getClient();
    const sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers to find City column position
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });
    
    const headers = headersResponse.data.values[0];
    const cityColumnIndex = headers.findIndex(header => header === 'City');
    
    if (cityColumnIndex === -1) {
      console.log('❌ City column not found in headers');
      return;
    }
    
    const cityColumn = String.fromCharCode(65 + cityColumnIndex); // Convert to letter
    console.log(`✅ City column found at position ${cityColumn} (index ${cityColumnIndex})`);
    
    // Get recent data including City column
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `Call Data!A:${cityColumn}`
    });
    
    const rows = dataResponse.data.values || [];
    
    // Check the most recent entries for City data
    console.log('\nRecent Call Data with City information:');
    console.log('Call ID | Emergency Address | City | State');
    console.log('--------|-------------------|------|------');
    
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const addressIndex = headers.findIndex(h => h === 'Emergency Address');
    const stateIndex = headers.findIndex(h => h === 'State');
    
    // Check last 5 rows (excluding header)
    const recentRows = rows.slice(-5);
    
    for (const row of recentRows) {
      if (row && row[callIdIndex]) {
        const callId = row[callIdIndex] || 'N/A';
        const address = (row[addressIndex] || 'N/A').substring(0, 30);
        const city = row[cityColumnIndex] || 'N/A';
        const state = row[stateIndex] || 'N/A';
        
        console.log(`${callId.padEnd(7)} | ${address.padEnd(17)} | ${city.padEnd(4)} | ${state}`);
      }
    }
    
    // Check if any recent calls have City data populated
    const callsWithCity = recentRows.filter(row => 
      row && row[cityColumnIndex] && row[cityColumnIndex].trim() !== ''
    );
    
    console.log(`\n✅ Found ${callsWithCity.length} recent calls with City data populated`);
    
    if (callsWithCity.length > 0) {
      console.log('✅ City column is working correctly!');
    } else {
      console.log('⚠️  No recent calls have City data - may be due to address format');
    }
    
  } catch (error) {
    console.error(`Error verifying City column: ${error.message}`);
  }
}

async function main() {
  await verifyCityColumn();
}

main().catch(console.error);