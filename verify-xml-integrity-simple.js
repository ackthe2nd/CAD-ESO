/**
 * Simple XML Integrity Verification
 * Verifies that XML stored in Google Sheets matches what's uploaded to ESO
 */

require('dotenv').config();
const { google } = require('googleapis');
const SftpClient = require('ssh2-sftp-client');
const logger = require('./src/fix-logger');

async function verifyXMLIntegrity() {
  console.log('XML Integrity Verification Report');
  console.log('='.repeat(50));

  try {
    // Initialize Google Sheets
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const logSheetId = process.env.LOG_SHEET_ID;

    // Get recent calls from Google Sheets
    console.log('Fetching recent calls from Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: logSheetId,
      range: 'Call Data!A:AK',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log('No call data found in Google Sheets');
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find relevant columns
    const callIdIndex = headers.indexOf('Emergency Call ID');
    const xmlIndex = headers.indexOf('Generated XML');
    const statusIndex = headers.indexOf('ESO Upload Status');
    const timestampIndex = headers.indexOf('Call Received Time');

    if (callIdIndex === -1 || xmlIndex === -1 || statusIndex === -1) {
      console.log('Required columns not found in Google Sheets');
      return;
    }

    // Get successful uploads from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUploads = dataRows.filter(row => {
      if (!row[callIdIndex] || !row[xmlIndex] || row[statusIndex] !== 'Success') {
        return false;
      }
      
      const callTime = new Date(row[timestampIndex]);
      return callTime > oneDayAgo;
    }).slice(-5); // Last 5 successful uploads

    console.log(`Found ${recentUploads.length} recent successful uploads to verify`);

    if (recentUploads.length === 0) {
      console.log('No recent successful uploads found for verification');
      return;
    }

    // Connect to SFTP
    console.log('Connecting to ESO SFTP server...');
    const sftp = new SftpClient();
    
    try {
      await sftp.connect({
        host: 'sftp.esosuite.net',
        port: 22,
        username: 'CA-EMS',
        password: process.env.SFTP_PASSWORD,
        readyTimeout: 30000,
        connectTimeout: 15000
      });

      console.log('Connected to ESO SFTP server');

      // Check SFTP directory for recent files
      const sftpDir = '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9';
      const sftpFiles = await sftp.list(sftpDir);
      
      // Filter for recent XML files
      const recentSftpFiles = sftpFiles.filter(file => {
        if (!file.name.endsWith('.xml')) return false;
        const fileTime = new Date(file.modifyTime);
        return fileTime > oneDayAgo;
      }).sort((a, b) => new Date(b.modifyTime) - new Date(a.modifyTime));

      console.log(`Found ${recentSftpFiles.length} recent XML files on SFTP server`);

      // Verification results
      let verifiedCount = 0;
      let totalChecked = 0;

      console.log('\nVerification Results:');
      console.log('-'.repeat(50));

      for (const upload of recentUploads) {
        const callId = upload[callIdIndex];
        const storedXML = upload[xmlIndex];
        
        totalChecked++;
        
        // Look for corresponding SFTP file
        const matchingFile = recentSftpFiles.find(file => 
          file.name.includes(callId)
        );

        if (!matchingFile) {
          console.log(`Call ${callId}: No matching SFTP file found`);
          continue;
        }

        try {
          // Download and compare
          const tempPath = `/tmp/verify_${matchingFile.name}`;
          await sftp.get(`${sftpDir}/${matchingFile.name}`, tempPath);
          
          const fs = require('fs');
          const sftpXML = fs.readFileSync(tempPath, 'utf8');
          
          // Normalize for comparison
          const normalize = (xml) => xml.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
          const normalizedStored = normalize(storedXML);
          const normalizedSftp = normalize(sftpXML);
          
          const matches = normalizedStored === normalizedSftp;
          
          if (matches) {
            console.log(`Call ${callId}: XML integrity VERIFIED (${storedXML.length} chars)`);
            verifiedCount++;
          } else {
            console.log(`Call ${callId}: XML mismatch detected (Sheets: ${storedXML.length}, SFTP: ${sftpXML.length})`);
          }
          
          // Cleanup
          fs.unlinkSync(tempPath);
          
        } catch (error) {
          console.log(`Call ${callId}: Verification failed - ${error.message}`);
        }
      }

      console.log('-'.repeat(50));
      console.log(`Verification Summary: ${verifiedCount}/${totalChecked} calls verified`);
      
      const integrityRate = totalChecked > 0 ? ((verifiedCount / totalChecked) * 100).toFixed(1) : '0.0';
      console.log(`XML Integrity Rate: ${integrityRate}%`);
      
      if (integrityRate >= 95) {
        console.log('Status: EXCELLENT - XML integrity maintained');
      } else if (integrityRate >= 80) {
        console.log('Status: GOOD - Minor discrepancies detected');
      } else {
        console.log('Status: ATTENTION NEEDED - Integrity issues detected');
      }

    } finally {
      await sftp.end();
      console.log('SFTP connection closed');
    }

  } catch (error) {
    console.error(`Verification failed: ${error.message}`);
  }

  console.log('='.repeat(50));
}

// Run verification
verifyXMLIntegrity().catch(console.error);