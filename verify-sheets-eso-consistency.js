/**
 * Verify Google Sheets and ESO XML Consistency
 * Ensures Call Data sheet contains exact XML that was sent to ESO
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Initialize Google Sheets connection
 */
async function initializeSheets() {
  const serviceAccountJson = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountJson,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  return google.sheets({ version: 'v4', auth });
}

/**
 * Get Call Data from Google Sheets
 */
async function getCallDataFromSheets(sheets, callId) {
  const sheetId = process.env.LOG_SHEET_ID;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Call Data!A1:AZ1000'
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) return null;
  
  const headers = rows[0];
  const callIdIndex = headers.indexOf('Call ID');
  const xmlIndex = headers.indexOf('XML Content');
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[callIdIndex] === callId) {
      return {
        callId: row[callIdIndex],
        xml: row[xmlIndex] || '',
        rowData: row
      };
    }
  }
  
  return null;
}

/**
 * Get most recent XML file for a call from logs directory
 */
function getMostRecentXMLFile(callId) {
  const logsDir = './logs';
  
  if (!fs.existsSync(logsDir)) return null;
  
  const files = fs.readdirSync(logsDir)
    .filter(file => file.startsWith(`call_${callId}_`) && file.endsWith('.xml'))
    .sort((a, b) => {
      const aTimestamp = parseInt(a.match(/call_\d+_(\d+)\.xml/)[1]);
      const bTimestamp = parseInt(b.match(/call_\d+_(\d+)\.xml/)[1]);
      return bTimestamp - aTimestamp;
    });
  
  if (files.length === 0) return null;
  
  const mostRecentFile = files[0];
  const filePath = path.join(logsDir, mostRecentFile);
  const xmlContent = fs.readFileSync(filePath, 'utf8');
  
  return {
    filename: mostRecentFile,
    content: xmlContent,
    timestamp: parseInt(mostRecentFile.match(/call_\d+_(\d+)\.xml/)[1])
  };
}

/**
 * Compare XML content (normalize whitespace for comparison)
 */
function normalizeXML(xml) {
  return xml.replace(/>\s+</g, '><').replace(/^\s+|\s+$/g, '');
}

/**
 * Update Google Sheets with most recent XML if needed
 */
async function updateSheetsWithLatestXML(sheets, callId, latestXML) {
  const sheetId = process.env.LOG_SHEET_ID;
  
  // Get current sheet data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Call Data!A1:AZ1000'
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) return false;
  
  const headers = rows[0];
  const callIdIndex = headers.indexOf('Call ID');
  const xmlIndex = headers.indexOf('XML Content');
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[callIdIndex] === callId) {
      // Update the XML content
      row[xmlIndex] = latestXML;
      
      // Update the row in sheets
      const range = `Call Data!A${i + 1}:AZ${i + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: { values: [row] }
      });
      
      return true;
    }
  }
  
  return false;
}

/**
 * Main verification function
 */
async function verifyConsistency() {
  console.log('Verifying Google Sheets and ESO XML Consistency...\n');
  
  try {
    const sheets = await initializeSheets();
    
    // Get recent call IDs from logs
    const logsDir = './logs';
    const xmlFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.xml') && file.includes('call_'))
      .sort((a, b) => {
        const aTimestamp = parseInt(a.match(/call_\d+_(\d+)\.xml/)[1]);
        const bTimestamp = parseInt(b.match(/call_\d+_(\d+)\.xml/)[1]);
        return bTimestamp - aTimestamp;
      })
      .slice(0, 10); // Check last 10 XML files
    
    const callIds = [...new Set(xmlFiles.map(file => file.match(/call_(\d+)_/)[1]))];
    
    console.log(`Checking consistency for ${callIds.length} recent calls...\n`);
    
    let inconsistencies = 0;
    let updates = 0;
    
    for (const callId of callIds) {
      console.log(`Checking Call ${callId}:`);
      
      // Get latest XML from logs
      const latestXML = getMostRecentXMLFile(callId);
      if (!latestXML) {
        console.log('  ⚠ No XML file found in logs');
        continue;
      }
      
      // Get XML from Google Sheets
      const sheetsData = await getCallDataFromSheets(sheets, callId);
      if (!sheetsData) {
        console.log('  ⚠ Call not found in Google Sheets');
        continue;
      }
      
      // Compare XML content
      const normalizedSheetsXML = normalizeXML(sheetsData.xml);
      const normalizedLatestXML = normalizeXML(latestXML.content);
      
      if (normalizedSheetsXML === normalizedLatestXML) {
        console.log('  ✓ XML matches between Sheets and ESO');
      } else {
        console.log('  ✗ XML inconsistency detected');
        console.log(`    Latest XML file: ${latestXML.filename}`);
        console.log(`    Sheets XML length: ${sheetsData.xml.length}`);
        console.log(`    Latest XML length: ${latestXML.content.length}`);
        
        // Update Google Sheets with latest XML
        console.log('  → Updating Google Sheets with latest XML...');
        const updated = await updateSheetsWithLatestXML(sheets, callId, latestXML.content);
        
        if (updated) {
          console.log('  ✓ Google Sheets updated with latest XML');
          updates++;
        } else {
          console.log('  ✗ Failed to update Google Sheets');
        }
        
        inconsistencies++;
      }
      
      console.log('');
    }
    
    console.log(`\nConsistency Check Summary:`);
    console.log(`  Calls checked: ${callIds.length}`);
    console.log(`  Inconsistencies found: ${inconsistencies}`);
    console.log(`  Sheets updated: ${updates}`);
    
    if (inconsistencies === 0) {
      console.log('  ✓ All XML data is consistent between Google Sheets and ESO');
    } else {
      console.log(`  ⚠ ${inconsistencies} inconsistencies were found and corrected`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Run the verification
verifyConsistency();