/**
 * Verify ESO Upload Status values in Google Sheets Call Data tab
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyUploadStatus() {
  console.log('Verifying ESO Upload Status values in Call Data sheet...');
  
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
    
    // Find column indices
    const callIdIndex = headers.indexOf('Emergency Call ID');
    const uploadStatusIndex = headers.indexOf('ESO Upload Status');
    const callTitleIndex = headers.indexOf('Call Title');
    const recordCreatedIndex = headers.indexOf('Record Created');
    
    console.log(`Column indices - Call ID: ${callIdIndex}, ESO Upload Status: ${uploadStatusIndex}`);
    
    if (uploadStatusIndex === -1) {
      console.log('❌ ESO Upload Status column not found in headers');
      console.log('Available headers:', headers);
      return;
    }
    
    // Get recent data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!2:20'
    });
    
    const rows = dataResponse.data.values || [];
    
    console.log('\n=== ESO Upload Status Analysis ===');
    console.log('Checking recent calls for upload status values...\n');
    
    const statusCounts = {};
    
    rows.forEach((row, index) => {
      if (row[callIdIndex] && ['201108', '201105', '201104'].includes(row[callIdIndex])) {
        const callId = row[callIdIndex];
        const uploadStatus = row[uploadStatusIndex] || 'Not Set';
        const callTitle = row[callTitleIndex] || 'N/A';
        const recordCreated = row[recordCreatedIndex] || 'N/A';
        
        console.log(`Call ${callId}:`);
        console.log(`  Title: ${callTitle}`);
        console.log(`  Upload Status: "${uploadStatus}"`);
        console.log(`  Last Updated: ${recordCreated}`);
        
        // Count status values
        statusCounts[uploadStatus] = (statusCounts[uploadStatus] || 0) + 1;
        
        // Validate status values
        const validStatuses = ['Successful', 'Failed', 'Pending', 'Processing...'];
        if (validStatuses.includes(uploadStatus)) {
          if (uploadStatus === 'Processing...') {
            console.log(`  ⚠️  Status is still "Processing..." - this should be updated`);
          } else if (uploadStatus === 'Successful') {
            console.log(`  ✅ Status correctly shows "Successful"`);
          } else if (uploadStatus === 'Failed') {
            console.log(`  ✅ Status correctly shows "Failed"`);
          } else if (uploadStatus === 'Pending') {
            console.log(`  ✅ Status correctly shows "Pending"`);
          }
        } else {
          console.log(`  ❌ Unknown status value: "${uploadStatus}"`);
        }
        
        console.log('');
      }
    });
    
    console.log('=== Status Summary ===');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`"${status}": ${count} calls`);
    });
    
    // Check if we still have Processing... entries
    if (statusCounts['Processing...']) {
      console.log('\n❌ Found calls with "Processing..." status');
      console.log('These should be updated to show final upload results');
    } else {
      console.log('\n✅ No "Processing..." entries found');
      console.log('All calls show proper upload status values');
    }
    
  } catch (error) {
    console.error('Error verifying upload status:', error.message);
  }
}

verifyUploadStatus();