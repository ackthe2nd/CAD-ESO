/**
 * XML Integrity Verification Script
 * Compares XML content in Google Sheets with actual uploaded files on ESO SFTP
 * Ensures complete data integrity between logged and uploaded content
 */

require('dotenv').config();
const { google } = require('googleapis');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

class XMLIntegrityVerifier {
  constructor() {
    this.sheets = null;
    this.sftp = new SftpClient();
    this.logSheetId = process.env.LOG_SHEET_ID;
    this.sftpConfig = {
      host: 'sftp.esosuite.net',
      username: 'CA-EMS',
      password: process.env.SFTP_PASSWORD,
      port: 22
    };
    this.sftpDir = '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9';
  }

  /**
   * Initialize Google Sheets API
   */
  async initializeSheets() {
    try {
      const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Google Sheets API initialized');
      return true;
    } catch (error) {
      console.error('✗ Failed to initialize Google Sheets:', error.message);
      return false;
    }
  }

  /**
   * Get call data from Google Sheets including XML content
   */
  async getCallDataFromSheets() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.logSheetId,
        range: 'Call Data!A:AK', // All columns through AK (37 columns)
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in Google Sheets');
        return [];
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find key column indices
      const callIdIndex = headers.indexOf('Call ID');
      const xmlIndex = headers.indexOf('XML Generated');
      const sftpStatusIndex = headers.indexOf('SFTP Upload Status');
      const timestampIndex = headers.indexOf('Call Received Time');

      if (callIdIndex === -1 || xmlIndex === -1) {
        console.error('Required columns not found in Google Sheets');
        return [];
      }

      const callData = [];
      for (const row of dataRows) {
        if (row[callIdIndex] && row[xmlIndex] && row[sftpStatusIndex] === 'Success') {
          callData.push({
            callId: row[callIdIndex],
            xml: row[xmlIndex],
            timestamp: row[timestampIndex],
            sftpStatus: row[sftpStatusIndex]
          });
        }
      }

      console.log(`✓ Found ${callData.length} successfully uploaded calls in Google Sheets`);
      return callData;
    } catch (error) {
      console.error('✗ Error reading from Google Sheets:', error.message);
      return [];
    }
  }

  /**
   * Connect to ESO SFTP server
   */
  async connectToSFTP() {
    try {
      await this.sftp.connect({
        host: this.sftpConfig.host,
        port: this.sftpConfig.port,
        username: this.sftpConfig.username,
        password: this.sftpConfig.password,
        readyTimeout: 60000,
        connectTimeout: 30000
      });
      console.log('✓ Connected to ESO SFTP server');
      return true;
    } catch (error) {
      console.error('✗ Failed to connect to SFTP:', error.message);
      return false;
    }
  }

  /**
   * Get XML file from ESO SFTP server
   */
  async getXMLFromSFTP(callId, timestamp) {
    try {
      // Generate expected filename based on call ID and timestamp
      const date = new Date(timestamp);
      const timestampStr = date.getTime().toString();
      const filename = `call-${callId}-${timestampStr}.xml`;
      const remotePath = `${this.sftpDir}/${filename}`;

      // Check if file exists
      const fileExists = await this.sftp.exists(remotePath);
      if (!fileExists) {
        console.log(`✗ File not found on SFTP: ${filename}`);
        return null;
      }

      // Download file content
      const tempPath = path.join(__dirname, 'temp', filename);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await this.sftp.get(remotePath, tempPath);
      const xmlContent = fs.readFileSync(tempPath, 'utf8');
      
      // Clean up temp file
      fs.unlinkSync(tempPath);

      console.log(`✓ Retrieved XML for call ${callId} from SFTP`);
      return xmlContent;
    } catch (error) {
      console.error(`✗ Error retrieving XML for call ${callId}:`, error.message);
      return null;
    }
  }

  /**
   * Compare XML content between Sheets and SFTP
   */
  compareXML(sheetsXML, sftpXML, callId) {
    // Normalize whitespace and formatting for comparison
    const normalizeXML = (xml) => {
      return xml
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/\s+/g, ' ')    // Normalize internal whitespace
        .trim();
    };

    const normalizedSheetsXML = normalizeXML(sheetsXML);
    const normalizedSftpXML = normalizeXML(sftpXML);

    const isMatch = normalizedSheetsXML === normalizedSftpXML;

    if (isMatch) {
      console.log(`✓ XML integrity verified for call ${callId}`);
    } else {
      console.log(`✗ XML mismatch detected for call ${callId}`);
      console.log('Sheets XML length:', sheetsXML.length);
      console.log('SFTP XML length:', sftpXML.length);
      
      // Find first difference for debugging
      const minLength = Math.min(normalizedSheetsXML.length, normalizedSftpXML.length);
      for (let i = 0; i < minLength; i++) {
        if (normalizedSheetsXML[i] !== normalizedSftpXML[i]) {
          console.log(`First difference at position ${i}:`);
          console.log(`Sheets: "${normalizedSheetsXML.substring(i, i + 50)}"`);
          console.log(`SFTP:   "${normalizedSftpXML.substring(i, i + 50)}"`);
          break;
        }
      }
    }

    return {
      match: isMatch,
      sheetsLength: sheetsXML.length,
      sftpLength: sftpXML.length
    };
  }

  /**
   * Generate integrity report
   */
  generateReport(results) {
    const totalCalls = results.length;
    const matchedCalls = results.filter(r => r.match).length;
    const mismatchedCalls = results.filter(r => !r.match).length;
    const notFoundCalls = results.filter(r => r.sftpXML === null).length;

    console.log('\n' + '='.repeat(60));
    console.log('XML INTEGRITY VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total calls checked: ${totalCalls}`);
    console.log(`XML matches: ${matchedCalls} (${((matchedCalls/totalCalls)*100).toFixed(1)}%)`);
    console.log(`XML mismatches: ${mismatchedCalls} (${((mismatchedCalls/totalCalls)*100).toFixed(1)}%)`);
    console.log(`Files not found on SFTP: ${notFoundCalls} (${((notFoundCalls/totalCalls)*100).toFixed(1)}%)`);

    if (mismatchedCalls > 0) {
      console.log('\nMISMATCHED CALLS:');
      results.filter(r => !r.match && r.sftpXML !== null).forEach(r => {
        console.log(`- Call ${r.callId}: Sheets=${r.sheetsLength}chars, SFTP=${r.sftpLength}chars`);
      });
    }

    if (notFoundCalls > 0) {
      console.log('\nFILES NOT FOUND ON SFTP:');
      results.filter(r => r.sftpXML === null).forEach(r => {
        console.log(`- Call ${r.callId}`);
      });
    }

    const integrityScore = ((matchedCalls / totalCalls) * 100).toFixed(1);
    console.log(`\nOVERALL INTEGRITY SCORE: ${integrityScore}%`);
    
    if (integrityScore >= 95) {
      console.log('✓ EXCELLENT: XML integrity is maintained');
    } else if (integrityScore >= 85) {
      console.log('⚠ GOOD: Minor XML discrepancies detected');
    } else {
      console.log('✗ POOR: Significant XML integrity issues detected');
    }
  }

  /**
   * Main verification process
   */
  async verifyIntegrity() {
    console.log('Starting XML integrity verification...\n');

    // Initialize services
    const sheetsReady = await this.initializeSheets();
    if (!sheetsReady) return;

    const sftpReady = await this.connectToSFTP();
    if (!sftpReady) return;

    try {
      // Get call data from Google Sheets
      const callData = await this.getCallDataFromSheets();
      if (callData.length === 0) {
        console.log('No calls to verify');
        return;
      }

      // Limit to recent calls for testing (last 10)
      const recentCalls = callData.slice(-10);
      console.log(`Verifying ${recentCalls.length} recent calls...\n`);

      const results = [];

      // Check each call
      for (const call of recentCalls) {
        console.log(`Checking call ${call.callId}...`);
        
        const sftpXML = await this.getXMLFromSFTP(call.callId, call.timestamp);
        
        if (sftpXML !== null) {
          const comparison = this.compareXML(call.xml, sftpXML, call.callId);
          results.push({
            callId: call.callId,
            match: comparison.match,
            sheetsLength: comparison.sheetsLength,
            sftpLength: comparison.sftpLength,
            sftpXML: sftpXML
          });
        } else {
          results.push({
            callId: call.callId,
            match: false,
            sheetsLength: call.xml.length,
            sftpLength: 0,
            sftpXML: null
          });
        }
      }

      // Generate report
      this.generateReport(results);

    } catch (error) {
      console.error('Error during verification:', error.message);
    } finally {
      await this.sftp.end();
      console.log('\n✓ SFTP connection closed');
    }
  }
}

// Run verification
async function main() {
  const verifier = new XMLIntegrityVerifier();
  await verifier.verifyIntegrity();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = XMLIntegrityVerifier;