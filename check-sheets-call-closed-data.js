/**
 * Check Google Sheets Call Closed Data
 * 
 * This script checks what's currently in Google Sheets for Call Closed Time
 * and Call Closed fields to verify if our closure detection is working.
 */

require('dotenv').config();
const { google } = require('googleapis');

async function checkSheetsCallClosedData() {
  console.log('Checking Google Sheets Call Closed Data');
  console.log('======================================');
  
  try {
    // Initialize Google Sheets client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get the headers first
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });
    
    const headers = headersResponse.data.values[0];
    console.log('Available headers:', headers);
    
    // Find the indices for Call Closed Time and Call Closed columns
    const callClosedTimeIndex = headers.indexOf('Call Closed Time');
    const callClosedIndex = headers.indexOf('Call Closed');
    const callIdIndex = headers.indexOf('Emergency Call ID');
    
    console.log(`\nColumn indices:`);
    console.log(`- Emergency Call ID: ${callIdIndex}`);
    console.log(`- Call Closed Time: ${callClosedTimeIndex}`);
    console.log(`- Call Closed: ${callClosedIndex}`);
    
    if (callClosedTimeIndex === -1 || callClosedIndex === -1 || callIdIndex === -1) {
      console.error('Required columns not found in Google Sheets');
      return;
    }
    
    // Get all data from the sheet
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:ZZ'
    });
    
    const rows = dataResponse.data.values || [];
    console.log(`\nFound ${rows.length - 1} call records (excluding header)`);
    
    // Check the last 10 calls for closure data
    console.log('\nRecent calls closure status:');
    console.log('=====================================');
    
    const recentCalls = rows.slice(-11, -1); // Last 10 calls (excluding header)
    
    recentCalls.forEach((row, index) => {
      const callId = row[callIdIndex] || 'Unknown';
      const callClosedTime = row[callClosedTimeIndex] || 'Not set';
      const callClosed = row[callClosedIndex] || 'Not set';
      
      console.log(`${index + 1}. Call ${callId}:`);
      console.log(`   Call Closed Time: ${callClosedTime}`);
      console.log(`   Call Closed: ${callClosed}`);
      console.log('');
    });
    
    // Count how many calls have closure data
    let callsWithClosedTime = 0;
    let callsWithClosedFlag = 0;
    let totalCalls = rows.length - 1;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[callClosedTimeIndex] && row[callClosedTimeIndex].trim() !== '' && row[callClosedTimeIndex] !== 'Not set') {
        callsWithClosedTime++;
      }
      if (row[callClosedIndex] && row[callClosedIndex].trim() !== '' && row[callClosedIndex] !== 'Not set') {
        callsWithClosedFlag++;
      }
    }
    
    console.log('Summary:');
    console.log(`- Total calls: ${totalCalls}`);
    console.log(`- Calls with Call Closed Time: ${callsWithClosedTime} (${((callsWithClosedTime/totalCalls)*100).toFixed(1)}%)`);
    console.log(`- Calls with Call Closed flag: ${callsWithClosedFlag} (${((callsWithClosedFlag/totalCalls)*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Error checking Google Sheets:', error.message);
  }
}

// Run the check
checkSheetsCallClosedData();