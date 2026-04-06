/**
 * Efficient Annual Call Report
 * Uses existing Google Sheets data and known call IDs to create comprehensive report
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');

class EfficientReporter {
  constructor() {
    this.token = null;
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.LOG_SHEET_ID;
    this.callsData = new Map();
  }

  async initialize() {
    console.log('Initializing efficient annual report generator...');
    
    this.token = await this.getResgridToken();
    this.auth = await this.getGoogleAuth();
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.log('Initialization complete');
  }

  async getResgridToken() {
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
      grant_type: 'password',
      username: process.env.RESGRID_USER,
      password: process.env.RESGRID_PASS
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    return response.data.access_token;
  }

  async getGoogleAuth() {
    let serviceAccount;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedJson);
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return auth;
  }

  async getKnownCallIds() {
    console.log('Reading known call IDs from Google Sheets...');
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Call Data!A:X'
    });
    
    const rows = response.data.values || [];
    const knownCallIds = new Set();
    
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[1]) { // Call ID column
          knownCallIds.add(row[1]);
        }
      }
    }
    
    // Add the calls we know exist from testing
    const additionalKnownCalls = [
      '198862', '198872', '198898', '198924', '198925', 
      '198926', '199025', '199011', '198930'
    ];
    
    additionalKnownCalls.forEach(id => knownCallIds.add(id));
    
    console.log(`Found ${knownCallIds.size} known call IDs`);
    return Array.from(knownCallIds);
  }

  async fetchDetailedCallData(callId) {
    try {
      const [callResponse, extraResponse] = await Promise.all([
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        }),
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
      ]);
      
      return {
        call: callResponse.data,
        extra: extraResponse.data
      };
    } catch (error) {
      console.log(`Failed to fetch call ${callId}: ${error.message}`);
      return null;
    }
  }

  extractUnitsFromCall(extraData) {
    const units = [];
    
    if (extraData.Data && extraData.Data.Dispatches) {
      const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
      unitDispatches.forEach(unit => {
        if (unit.Name) units.push(unit.Name);
      });
    }
    
    if (extraData.Dispatches) {
      const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
      unitDispatches.forEach(unit => {
        if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
      });
    }
    
    return units;
  }

  extractTimestamps(callData, extraData, units) {
    const timestamps = {
      logged: callData.LoggedOn || callData.LoggedOnUtc || '',
      dispatched: callData.DispatchedOn || callData.DispatchedOnUtc || '',
      enRoute: '',
      onScene: '',
      atPatient: '',
      cleared: '',
      backInService: ''
    };

    if (extraData.Data && extraData.Data.Activity) {
      const activities = extraData.Data.Activity.filter(a => a.Type === 'Unit' && units.includes(a.Name));
      
      const enRouteActivities = activities.filter(a => a.StatusId === 5);
      const onSceneActivities = activities.filter(a => a.StatusId === 6);
      const atPatientActivities = activities.filter(a => a.StatusId === 3);
      const clearedActivities = activities.filter(a => a.StatusId === 8);
      const backInServiceActivities = activities.filter(a => a.StatusId === 2);
      
      if (enRouteActivities.length > 0) {
        timestamps.enRoute = enRouteActivities.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))[0].Timestamp;
      }
      
      if (onSceneActivities.length > 0) {
        timestamps.onScene = onSceneActivities.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))[0].Timestamp;
      }

      if (atPatientActivities.length > 0) {
        timestamps.atPatient = atPatientActivities.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))[0].Timestamp;
      }

      if (clearedActivities.length > 0) {
        timestamps.cleared = clearedActivities.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0].Timestamp;
      }

      if (backInServiceActivities.length > 0) {
        timestamps.backInService = backInServiceActivities.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0].Timestamp;
      }
    }

    return timestamps;
  }

  async attemptSftpUpload(xml, callId) {
    const fs = require('fs');
    const path = require('path');
    const { uploadFileToSFTP } = require('./src/sftp-client');
    
    const fileName = `call_${callId}_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
    const remoteFilePath = `${process.env.SFTP_DIR || '/incoming'}/${fileName}`;
    const sftpUrl = `sftp://${process.env.SFTP_HOST}${remoteFilePath}`;
    
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create XML file
      const localFilePath = path.join(tempDir, fileName);
      
      // Write XML to file
      fs.writeFileSync(localFilePath, xml);
      
      // Attempt SFTP upload and capture exact error
      const uploadResult = await uploadFileToSFTP(localFilePath, remoteFilePath);
      
      // Clean up temp file
      fs.unlinkSync(localFilePath);
      
      if (uploadResult === true) {
        return { status: 'Success', url: sftpUrl };
      } else if (uploadResult === false) {
        return { status: 'Skipped (No Changes)', url: sftpUrl };
      } else {
        return { status: 'Failed', url: sftpUrl };
      }
      
    } catch (error) {
      // Determine specific failure reason
      let failureReason = 'Failed';
      if (error.message.includes('authentication')) {
        failureReason = 'Failed: Authentication Error';
      } else if (error.message.includes('connection')) {
        failureReason = 'Failed: Connection Error';
      } else if (error.message.includes('timeout')) {
        failureReason = 'Failed: Timeout';
      } else {
        failureReason = `Failed: ${error.message.substring(0, 50)}`;
      }
      
      return { status: failureReason, url: sftpUrl };
    }
  }

  async processKnownCalls() {
    const knownCallIds = await this.getKnownCallIds();
    
    console.log(`Processing ${knownCallIds.length} known calls...`);
    
    for (const callId of knownCallIds) {
      try {
        console.log(`Processing call ${callId}...`);
        
        const detailedData = await this.fetchDetailedCallData(callId);
        if (!detailedData) continue;
        
        const callData = detailedData.call.Data || detailedData.call;
        const extraData = detailedData.extra;
        
        const units = this.extractUnitsFromCall(extraData);
        const xml = generateXML(detailedData.call, detailedData.extra);
        const xmlStructure = units.length > 1 ? 'Nested (Multiple Units)' : 'Flat (Single Unit)';
        
        const timestamps = this.extractTimestamps(callData, extraData, units);
        
        const address = callData.Address || '';
        const addressParts = address.split(',').map(p => p.trim());
        
        // Attempt actual SFTP upload and get real status
        console.log(`Attempting SFTP upload for call ${callId}...`);
        const sftpResult = await this.attemptSftpUpload(xml, callId);
        
        this.callsData.set(callId, {
          lastUpdated: new Date().toISOString(),
          callId,
          loggedOn: timestamps.logged,
          dispatchedOn: timestamps.dispatched,
          name: callData.Name || '',
          nature: callData.Nature || '',
          note: callData.Note || '',
          type: callData.Type || '',
          priority: callData.Priority ? (typeof callData.Priority === 'object' ? callData.Priority.Name || callData.Priority.Id : callData.Priority) : '',
          address: address,
          city: addressParts[1] || '',
          state: addressParts[2] ? addressParts[2].split(' ')[0] : '',
          zip: addressParts[2] ? addressParts[2].split(' ')[1] : '',
          latitude: callData.Latitude || '',
          longitude: callData.Longitude || '',
          contactName: callData.ContactName || '',
          contactInfo: callData.ContactInfo || '',
          externalId: callData.ExternalId || '',
          units: units.join(', '),
          unitCount: units.length,
          xmlStructure,
          enRouteTime: timestamps.enRoute,
          onSceneTime: timestamps.onScene,
          atPatientTime: timestamps.atPatient,
          clearedTime: timestamps.cleared,
          backInServiceTime: timestamps.backInService,
          sftpStatus: sftpResult.status,
          sftpUrl: sftpResult.url,
          xml
        });
        
      } catch (error) {
        console.error(`Error processing call ${callId}:`, error.message);
      }
    }
    
    console.log(`Successfully processed ${this.callsData.size} calls`);
  }

  async createAnnualReportSheet() {
    console.log('Creating Annual Call Report sheet...');
    
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Annual Call Report 2025',
                gridProperties: {
                  rowCount: this.callsData.size + 100,
                  columnCount: 30
                }
              }
            }
          }]
        }
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Sheet exists, updating data...');
      }
    }
    
    const headers = [
      'Last Updated', 'Call ID', 'Logged On', 'Dispatched On', 'Call Name', 'Nature', 'Note', 'Type',
      'Priority', 'Address', 'City', 'State', 'Zip', 'Latitude', 'Longitude', 'Contact Name',
      'Contact Info', 'External ID', 'Units', 'Unit Count', 'XML Structure', 'En Route Time',
      'On Scene Time', 'At Patient Time', 'Cleared Time', 'Back In Service Time', 'SFTP Status', 'SFTP URL', 'XML'
    ];
    
    const dataRows = Array.from(this.callsData.values()).map(call => [
      call.lastUpdated, call.callId, call.loggedOn, call.dispatchedOn, call.name, call.nature,
      call.note, call.type, call.priority, call.address, call.city, call.state, call.zip,
      call.latitude, call.longitude, call.contactName, call.contactInfo, call.externalId,
      call.units, call.unitCount, call.xmlStructure, call.enRouteTime, call.onSceneTime,
      call.atPatientTime, call.clearedTime, call.backInServiceTime, call.sftpStatus, call.sftpUrl, call.xml
    ]);
    
    dataRows.sort((a, b) => new Date(b[2]) - new Date(a[2]));
    
    const allData = [headers, ...dataRows];
    
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: 'Annual Call Report 2025!A:AB'
    });
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Annual Call Report 2025!A1',
      valueInputOption: 'RAW',
      resource: { values: allData }
    });
    
    console.log(`Annual report created with ${dataRows.length} calls`);
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Logs!A:E',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          'info',
          `Annual Call Report completed: ${dataRows.length} calls with complete XML and SFTP tracking`,
          'ANNUAL_REPORT',
          'Comprehensive call data analysis with unit response tracking'
        ]]
      }
    });
  }

  async generateReport() {
    await this.initialize();
    await this.processKnownCalls();
    await this.createAnnualReportSheet();
    
    console.log('\nAnnual Call Report Summary:');
    console.log('==========================');
    console.log(`Total calls processed: ${this.callsData.size}`);
    
    const singleUnitCalls = Array.from(this.callsData.values()).filter(call => call.unitCount === 1).length;
    const multiUnitCalls = Array.from(this.callsData.values()).filter(call => call.unitCount > 1).length;
    const successfulSftp = Array.from(this.callsData.values()).filter(call => call.sftpStatus === 'Success').length;
    
    console.log(`Single unit calls: ${singleUnitCalls}`);
    console.log(`Multiple unit calls: ${multiUnitCalls}`);
    console.log(`Successful SFTP uploads: ${successfulSftp}`);
    console.log('Report available in "Annual Call Report 2025" sheet');
  }
}

async function main() {
  try {
    const reporter = new EfficientReporter();
    await reporter.generateReport();
  } catch (error) {
    console.error('Report generation failed:', error.message);
  }
}

main();