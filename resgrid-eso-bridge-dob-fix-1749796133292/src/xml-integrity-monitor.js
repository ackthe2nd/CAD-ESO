/**
 * XML Integrity Monitor
 * Continuously monitors and verifies XML consistency between Google Sheets and ESO uploads
 * Integrated into the main application for real-time integrity checking
 */

const logger = require('./fix-logger');
const { google } = require('googleapis');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

class XMLIntegrityMonitor {
  constructor() {
    this.sheets = null;
    this.logSheetId = process.env.LOG_SHEET_ID;
    this.integrityCheckInterval = 30 * 60 * 1000; // 30 minutes
    this.lastIntegrityCheck = 0;
    this.integrityStats = {
      totalChecked: 0,
      matched: 0,
      mismatched: 0,
      notFound: 0
    };
  }

  /**
   * Initialize Google Sheets API
   */
  async initializeSheets() {
    try {
      if (this.sheets) return true;

      const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      logger.info('XML Integrity Monitor: Google Sheets API initialized');
      return true;
    } catch (error) {
      logger.error(`XML Integrity Monitor: Failed to initialize Google Sheets: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify XML integrity for a specific call immediately after upload
   */
  async verifyCallIntegrity(callId, expectedXML, uploadTimestamp, actualFilename = null) {
    try {
      // Use actual filename if provided, otherwise generate expected filename
      let filename;
      if (actualFilename) {
        filename = actualFilename;
      } else {
        const timestamp = new Date(uploadTimestamp).getTime().toString();
        filename = `call-${callId}-${timestamp}.xml`;
      }
      
      // Check SFTP for the uploaded file
      const sftp = new SftpClient();
      
      try {
        await sftp.connect({
          host: 'sftp.esosuite.net',
          username: 'CA-EMS',
          password: process.env.SFTP_PASSWORD,
          port: 22,
          readyTimeout: 30000,
          connectTimeout: 15000
        });

        const remotePath = `/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9/${filename}`;
        const fileExists = await sftp.exists(remotePath);
        
        if (!fileExists) {
          logger.warn(`XML Integrity: File not found on SFTP for call ${callId}: ${filename}`);
          return { verified: false, reason: 'file_not_found' };
        }

        // Download and compare
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempPath = path.join(tempDir, filename);
        await sftp.get(remotePath, tempPath);
        
        const uploadedXML = fs.readFileSync(tempPath, 'utf8');
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
        
        // Compare XML content
        const isMatch = this.compareXMLContent(expectedXML, uploadedXML);
        
        if (isMatch) {
          logger.info(`XML Integrity: Verified for call ${callId} - content matches`);
          this.integrityStats.matched++;
        } else {
          logger.warn(`XML Integrity: Mismatch detected for call ${callId}`);
          logger.warn(`Expected length: ${expectedXML.length}, Uploaded length: ${uploadedXML.length}`);
          this.integrityStats.mismatched++;
        }

        this.integrityStats.totalChecked++;
        
        return { 
          verified: isMatch, 
          reason: isMatch ? 'verified' : 'content_mismatch',
          expectedLength: expectedXML.length,
          uploadedLength: uploadedXML.length
        };

      } finally {
        await sftp.end();
      }

    } catch (error) {
      logger.error(`XML Integrity: Error verifying call ${callId}: ${error.message}`);
      return { verified: false, reason: 'verification_error', error: error.message };
    }
  }

  /**
   * Compare XML content with normalization
   */
  compareXMLContent(xml1, xml2) {
    const normalize = (xml) => {
      return xml
        .replace(/>\s+</g, '><')     // Remove whitespace between tags
        .replace(/\s+/g, ' ')        // Normalize internal whitespace
        .replace(/\s*=\s*/g, '=')    // Remove spaces around attributes
        .trim();
    };

    return normalize(xml1) === normalize(xml2);
  }

  /**
   * Periodic integrity check of recent uploads
   */
  async performPeriodicIntegrityCheck() {
    const now = Date.now();
    
    // Skip if not enough time has passed
    if (now - this.lastIntegrityCheck < this.integrityCheckInterval) {
      return;
    }

    this.lastIntegrityCheck = now;
    
    try {
      if (!await this.initializeSheets()) {
        return;
      }

      logger.info('XML Integrity: Starting periodic integrity check');

      // Get recent successful uploads from Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.logSheetId,
        range: 'Call Data!A:AK',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        logger.info('XML Integrity: No data to check');
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find column indices
      const callIdIndex = headers.indexOf('Call ID');
      const xmlIndex = headers.indexOf('XML Generated');
      const sftpStatusIndex = headers.indexOf('SFTP Upload Status');
      const timestampIndex = headers.indexOf('Call Received Time');

      if (callIdIndex === -1 || xmlIndex === -1 || sftpStatusIndex === -1) {
        logger.warn('XML Integrity: Required columns not found in Google Sheets');
        return;
      }

      // Get recent successful uploads (last 5)
      const recentSuccessfulUploads = dataRows
        .filter(row => row[sftpStatusIndex] === 'Success' && row[xmlIndex] && row[callIdIndex])
        .slice(-5);

      logger.info(`XML Integrity: Checking ${recentSuccessfulUploads.length} recent uploads`);

      let checkedCount = 0;
      for (const row of recentSuccessfulUploads) {
        const callId = row[callIdIndex];
        const xml = row[xmlIndex];
        const timestamp = row[timestampIndex];

        const result = await this.verifyCallIntegrity(callId, xml, timestamp);
        checkedCount++;

        // Add small delay between checks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`XML Integrity: Periodic check completed - verified ${checkedCount} calls`);
      this.logIntegrityStats();

    } catch (error) {
      logger.error(`XML Integrity: Error during periodic check: ${error.message}`);
    }
  }

  /**
   * Log current integrity statistics
   */
  logIntegrityStats() {
    const { totalChecked, matched, mismatched, notFound } = this.integrityStats;
    
    if (totalChecked > 0) {
      const matchRate = ((matched / totalChecked) * 100).toFixed(1);
      logger.info(`XML Integrity Stats: ${totalChecked} checked, ${matched} matched (${matchRate}%), ${mismatched} mismatched, ${notFound} not found`);
    }
  }

  /**
   * Reset integrity statistics
   */
  resetStats() {
    this.integrityStats = {
      totalChecked: 0,
      matched: 0,
      mismatched: 0,
      notFound: 0
    };
    logger.info('XML Integrity: Statistics reset');
  }

  /**
   * Get integrity report
   */
  getIntegrityReport() {
    const { totalChecked, matched, mismatched, notFound } = this.integrityStats;
    
    return {
      totalChecked,
      matched,
      mismatched,
      notFound,
      matchRate: totalChecked > 0 ? ((matched / totalChecked) * 100).toFixed(1) : '0.0',
      lastCheck: new Date(this.lastIntegrityCheck).toISOString()
    };
  }

  /**
   * Start monitoring (called from main application)
   */
  startMonitoring() {
    logger.info('XML Integrity Monitor: Starting integrity monitoring');
    
    // Perform initial check after 5 minutes
    setTimeout(() => {
      this.performPeriodicIntegrityCheck();
    }, 5 * 60 * 1000);

    // Set up periodic checks
    setInterval(() => {
      this.performPeriodicIntegrityCheck();
    }, this.integrityCheckInterval);
  }
}

module.exports = XMLIntegrityMonitor;