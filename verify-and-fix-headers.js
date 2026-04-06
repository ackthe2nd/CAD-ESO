/**
 * Verify and Fix Call Data Headers
 * Ensures all 36 headers are correctly positioned and named
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyAndFixHeaders() {
  console.log('Verifying Call Data Headers');
  console.log('===========================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current headers
    const currentResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const currentHeaders = currentResponse.data.values?.[0] || [];
    console.log(`Current headers count: ${currentHeaders.length}`);
    
    // Define the exact correct headers in proper order
    const correctHeaders = [
      'Call Received Time',          // A (0)
      'Emergency Call ID',           // B (1)
      'Priority Description',        // C (2)
      'Responding Units',            // D (3)
      'Call Title',                  // E (4)
      'Incident Type',               // F (5)
      'Incident Details',            // G (6)
      'Emergency Address',           // H (7)
      'Address Line 1',              // I (8)
      'Address Line 2',              // J (9)
      'State',                       // K (10)
      'ZIP Code',                    // L (11)
      'GPS Latitude',                // M (12)
      'GPS Longitude',               // N (13)
      'Additional Notes',            // O (14)
      'Patient/Caller Name',         // P (15)
      'Contact Information',         // Q (16)
      'Patient DOB',                 // R (17)
      'Call Closed Time',            // S (18)
      'Generated XML',               // T (19)
      'ESO Upload Status',           // U (20)
      'Response Mode',               // V (21)
      'Priority Level',              // W (22)
      'Record Created',              // X (23)
      'Last Updated',                // Y (24)
      'Number of Units',             // Z (25)
      'Unit Dispatched Times',       // AA (26)
      'Unit En Route Times',         // AB (27)
      'Unit Arrived Times',          // AC (28)
      'Unit At Patient Times',       // AD (29)
      'Unit Cleared Times',          // AE (30)
      'Unit Back In Service Times',  // AF (31)
      'Unit Transport Times',        // AG (32)
      'Unit At Hospital Times',      // AH (33)
      'Call Closed',                 // AI (34)
      'Test Call'                    // AJ (35)
    ];

    console.log(`Target headers count: ${correctHeaders.length}`);
    
    // Compare headers
    let needsUpdate = false;
    const issues = [];
    
    if (currentHeaders.length !== correctHeaders.length) {
      needsUpdate = true;
      issues.push(`Header count mismatch: ${currentHeaders.length} vs ${correctHeaders.length}`);
    }
    
    for (let i = 0; i < Math.max(currentHeaders.length, correctHeaders.length); i++) {
      const current = currentHeaders[i] || '';
      const correct = correctHeaders[i] || '';
      
      if (current !== correct) {
        needsUpdate = true;
        const columnLetter = i < 26 ? String.fromCharCode(65 + i) : 
                           String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
        issues.push(`Column ${columnLetter}: "${current}" should be "${correct}"`);
      }
    }
    
    if (issues.length > 0) {
      console.log('\nIssues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (needsUpdate) {
      console.log('\nUpdating headers...');
      
      // Update headers to correct values
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: 'Call Data!A1:AJ1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [correctHeaders],
        },
      });
      
      console.log('✅ Headers updated successfully');
    } else {
      console.log('✅ Headers are already correct');
    }
    
    // Verify the update
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nFinal verification: ${finalHeaders.length} headers`);
    
    // Show key column positions
    const keyColumns = [
      'Call Closed Time',
      'Test Call',
      'Call Closed',
      'Call Title',
      'Incident Type'
    ];
    
    console.log('\nKey column positions:');
    keyColumns.forEach(header => {
      const index = finalHeaders.findIndex(h => h === header);
      if (index >= 0) {
        const columnLetter = index < 26 ? String.fromCharCode(65 + index) : 
                           String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));
        console.log(`  ${header}: Column ${columnLetter} (index ${index})`);
      } else {
        console.log(`  ${header}: NOT FOUND`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await verifyAndFixHeaders();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyAndFixHeaders };