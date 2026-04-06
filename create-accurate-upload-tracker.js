/**
 * Create Accurate Upload Tracker
 * Update ESO Upload Status column with real SFTP upload results
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

async function getResgridToken() {
  const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
    grant_type: 'password',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  return response.data.access_token;
}

async function getGoogleAuth() {
  let serviceAccount;
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decodedJson);
  } else {
    throw new Error('No Google service account credentials found');
  }

  return new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function attemptSFTPUpload(callId, xml) {
  // Check if SFTP credentials are available
  if (!process.env.SFTP_HOST || !process.env.SFTP_USER || !process.env.SFTP_PASS) {
    return {
      success: false,
      status: 'Failed: Missing SFTP Credentials',
      details: 'SFTP_HOST, SFTP_USER, or SFTP_PASS not configured',
      url: ''
    };
  }

  const sftp = new SftpClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `call_${callId}_${timestamp}.xml`;
  const remotePath = `${process.env.SFTP_DIR || '/incoming'}/${filename}`;
  const localPath = path.join(__dirname, 'temp', filename);
  
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.dirname(localPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write XML to local file
    fs.writeFileSync(localPath, xml);
    
    console.log(`Attempting SFTP upload for call ${callId}...`);
    
    // Connect to SFTP server
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASS,
      retries: 2,
      retry_factor: 2,
      retry_minTimeout: 2000
    });
    
    console.log('Connected to SFTP server');
    
    // Check if remote directory exists
    const remoteDir = process.env.SFTP_DIR || '/incoming';
    const dirExists = await sftp.exists(remoteDir);
    
    if (!dirExists) {
      console.log(`Creating remote directory: ${remoteDir}`);
      await sftp.mkdir(remoteDir, true);
    }
    
    // Upload the file
    await sftp.put(localPath, remotePath);
    console.log(`File uploaded successfully: ${remotePath}`);
    
    return {
      success: true,
      status: 'Success',
      details: `Uploaded to ${process.env.SFTP_HOST}${remotePath}`,
      url: `sftp://${process.env.SFTP_HOST}${remotePath}`
    };
    
  } catch (error) {
    console.log(`SFTP upload failed: ${error.message}`);
    
    let status = 'Failed: Unknown Error';
    let details = error.message;
    
    // Categorize the error for better reporting
    if (error.message.toLowerCase().includes('authentication') || 
        error.message.toLowerCase().includes('login') ||
        error.message.toLowerCase().includes('permission denied')) {
      status = 'Failed: Authentication Error';
      details = 'Invalid SFTP credentials or insufficient permissions';
    } else if (error.message.toLowerCase().includes('connection') ||
               error.message.toLowerCase().includes('timeout') ||
               error.message.toLowerCase().includes('enotfound')) {
      status = 'Failed: Connection Error';
      details = `Cannot connect to ${process.env.SFTP_HOST}:${process.env.SFTP_PORT || 22}`;
    } else if (error.message.toLowerCase().includes('directory') ||
               error.message.toLowerCase().includes('path')) {
      status = 'Failed: Directory Error';
      details = `Cannot access directory: ${process.env.SFTP_DIR || '/incoming'}`;
    }
    
    return {
      success: false,
      status,
      details,
      url: ''
    };
    
  } finally {
    // Cleanup
    try {
      await sftp.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // Remove temp file
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function updateCallDataWithUploadStatus(auth, callId, uploadResult) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log(`Updating Call Data sheet with upload status for call ${callId}...`);
  
  // Get current Call Data sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  const rows = response.data.values || [];
  
  // Find the row for this call and update upload status
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] === callId) { // Emergency Call ID column
      // Update ESO Upload Status (column AH, index 33) and ESO File Location (column AI, index 34)
      row[33] = uploadResult.status;
      row[34] = uploadResult.url;
      
      // Update the specific row
      const range = `Call Data!A${i + 1}:AJ${i + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [row]
        }
      });
      
      console.log(`Updated call ${callId}: Status="${uploadResult.status}", URL="${uploadResult.url}"`);
      return true;
    }
  }
  
  console.log(`Call ${callId} not found in Call Data sheet`);
  return false;
}

async function testUploadStatusTracking(auth, token) {
  console.log('Testing upload status tracking with real SFTP attempts...');
  
  const testCalls = ['200893', '200576'];
  
  for (const callId of testCalls) {
    try {
      // Get current XML from Call Data sheet
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.LOG_SHEET_ID;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Call Data!A:AJ'
      });
      
      const rows = response.data.values || [];
      let xml = '';
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[1] === callId) {
          xml = row[31] || ''; // Generated XML column
          break;
        }
      }
      
      if (!xml) {
        console.log(`No XML found for call ${callId}`);
        continue;
      }
      
      console.log(`\nTesting upload for call ${callId} (${xml.length} bytes XML)...`);
      
      // Attempt real SFTP upload
      const uploadResult = await attemptSFTPUpload(callId, xml);
      
      console.log(`Upload result: ${uploadResult.status}`);
      if (!uploadResult.success) {
        console.log(`Details: ${uploadResult.details}`);
      }
      
      // Update the sheet with real status
      await updateCallDataWithUploadStatus(auth, callId, uploadResult);
      
    } catch (error) {
      console.log(`Error testing call ${callId}: ${error.message}`);
      
      // Update with error status
      const errorResult = {
        success: false,
        status: 'Failed: Processing Error',
        details: error.message,
        url: ''
      };
      
      await updateCallDataWithUploadStatus(auth, callId, errorResult);
    }
  }
}

async function main() {
  console.log('Creating Accurate Upload Status Tracking');
  console.log('======================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    console.log('Authentication successful');
    
    // Test real SFTP upload attempts and update status
    await testUploadStatusTracking(auth, token);
    
    console.log('\n=== UPLOAD STATUS TRACKING COMPLETE ===');
    console.log('ESO Upload Status column (AH) now shows real SFTP results:');
    console.log('- "Success" = File uploaded successfully');
    console.log('- "Failed: Authentication Error" = Invalid SFTP credentials');
    console.log('- "Failed: Connection Error" = Cannot connect to SFTP server');
    console.log('- "Failed: Directory Error" = Cannot access upload directory');
    console.log('- "Failed: Missing SFTP Credentials" = SFTP not configured');
    console.log('\nESO File Location column (AI) shows actual upload URLs when successful');
    
  } catch (error) {
    console.error('Upload status tracking failed:', error.message);
  }
}

main();