/**
 * Annual Call Report Generator - Using Working Endpoints
 * Uses confirmed working Resgrid endpoints to fetch historical call data
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');

class AnnualCallReporter {
  constructor() {
    this.token = null;
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.LOG_SHEET_ID;
    this.callsData = new Map();
  }

  async initialize() {
    console.log('Initializing annual call report generator...');
    
    this.token = await this.getResgridToken();
    if (!this.token) {
      throw new Error('Failed to authenticate with Resgrid API');
    }
    
    this.auth = await this.getGoogleAuth();
    if (!this.auth) {
      throw new Error('Failed to authenticate with Google Sheets');
    }
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    console.log('Initialization complete');
  }

  async getResgridToken() {
    try {
      const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
        grant_type: 'password',
        username: process.env.RESGRID_USER,
        password: process.env.RESGRID_PASS
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('Resgrid authentication failed:', error.message);
      return null;
    }
  }

  async getGoogleAuth() {
    try {
      let serviceAccount;
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
        const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decodedJson);
      } else {
        throw new Error('No Google service account credentials found');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      return auth;
    } catch (error) {
      console.error('Google authentication failed:', error.message);
      return null;
    }
  }

  async getExistingCallsFromSheets() {
    console.log('Reading existing calls from Google Sheets...');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!A:X'
      });
      
      const rows = response.data.values || [];
      const existingCalls = [];
      
      if (rows.length > 1) {
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[1]) { // Call ID column
            existingCalls.push(row[1]); // Add Call ID to list
          }
        }
      }
      
      console.log(`Found ${existingCalls.length} existing calls in Google Sheets`);
      return [...new Set(existingCalls)]; // Remove duplicates
    } catch (error) {
      console.error('Error reading existing calls from sheets:', error.message);
      return [];
    }
  }

  async fetchCallsFromKnownRange() {
    console.log('Fetching calls from known ID ranges...');
    
    // Based on existing Google Sheets data, calls are in 198xxx-199xxx range
    const callIds = [];
    
    // Generate call IDs to check based on known patterns
    for (let i = 198800; i <= 199100; i++) {
      callIds.push(i.toString());
    }
    
    console.log(`Checking ${callIds.length} potential call IDs...`);
    
    const validCalls = [];
    const batchSize = 10;
    
    for (let i = 0; i < callIds.length; i += batchSize) {
      const batch = callIds.slice(i, i + batchSize);
      
      const promises = batch.map(async callId => {
        try {
          const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
          });
          
          if (response.status === 200 && response.data) {
            return { callId, data: response.data };
          }
        } catch (error) {
          // Call doesn't exist or access denied
          return null;
        }
      });
      
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          validCalls.push(result.value);
        }
      });
      
      if (i % 50 === 0) {
        console.log(`Processed ${i + batchSize} call IDs, found ${validCalls.length} valid calls`);
      }
    }
    
    console.log(`Found ${validCalls.length} valid calls`);
    return validCalls;
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
      console.error(`Failed to fetch details for call ${callId}:`, error.message);
      return null;
    }
  }

  extractUnitsFromCall(extraData) {
    const units = [];
    
    // Check Data.Dispatches
    if (extraData.Data && extraData.Data.Dispatches) {
      const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
      unitDispatches.forEach(unit => {
        if (unit.Name) units.push(unit.Name);
      });
    }
    
    // Check direct Dispatches
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

    // Extract from Activity array
    if (extraData.Data && extraData.Data.Activity) {
      const activities = extraData.Data.Activity.filter(a => a.Type === 'Unit' && units.includes(a.Name));
      
      const enRouteActivities = activities.filter(a => a.StatusId === 5);
      const onSceneActivities = activities.filter(a => a.StatusId === 6);
      
      if (enRouteActivities.length > 0) {
        timestamps.enRoute = enRouteActivities.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))[0].Timestamp;
      }
      
      if (onSceneActivities.length > 0) {
        timestamps.onScene = onSceneActivities.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))[0].Timestamp;
      }
    }

    return timestamps;
  }

  async processAllCalls() {
    console.log('Processing all available calls...');
    
    const calls = await this.fetchCallsFromKnownRange();
    
    for (const callInfo of calls) {
      try {
        const callId = callInfo.callId;
        const lastUpdated = new Date().toISOString();
        
        console.log(`Processing call ${callId}...`);
        
        const detailedData = await this.fetchDetailedCallData(callId);
        if (!detailedData) continue;
        
        const callData = detailedData.call.Data || detailedData.call;
        const extraData = detailedData.extra;
        
        // Extract units and generate XML
        const units = this.extractUnitsFromCall(extraData);
        const xml = generateXML(detailedData.call, detailedData.extra);
        const xmlStructure = units.length > 1 ? 'Nested (Multiple Units)' : 'Flat (Single Unit)';
        
        // Extract timestamps
        const timestamps = this.extractTimestamps(callData, extraData, units);
        
        // Parse address
        const address = callData.Address || '';
        const addressParts = address.split(',').map(p => p.trim());
        
        // Determine SFTP status
        const sftpStatus = xml && xml.includes('<?xml') ? 'Success' : 'Failed';
        
        // Store comprehensive call data
        this.callsData.set(callId, {
          lastUpdated,
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
          sftpStatus,
          xml
        });
        
      } catch (error) {
        console.error(`Error processing call ${callInfo.callId}:`, error.message);
      }
    }
    
    console.log(`Processed ${this.callsData.size} unique calls`);
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
      
      console.log('Created new sheet: Annual Call Report 2025');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Sheet already exists, updating existing data');
      } else {
        throw error;
      }
    }
    
    // Headers
    const headers = [
      'Last Updated',
      'Call ID',
      'Logged On',
      'Dispatched On', 
      'Call Name',
      'Nature',
      'Note',
      'Type',
      'Priority',
      'Address',
      'City',
      'State',
      'Zip',
      'Latitude',
      'Longitude',
      'Contact Name',
      'Contact Info',
      'External ID',
      'Units',
      'Unit Count',
      'XML Structure',
      'En Route Time',
      'On Scene Time',
      'At Patient Time',
      'Cleared Time',
      'Back In Service Time',
      'SFTP Status',
      'XML'
    ];
    
    // Data rows
    const dataRows = Array.from(this.callsData.values()).map(call => [
      call.lastUpdated,
      call.callId,
      call.loggedOn,
      call.dispatchedOn,
      call.name,
      call.nature,
      call.note,
      call.type,
      call.priority,
      call.address,
      call.city,
      call.state,
      call.zip,
      call.latitude,
      call.longitude,
      call.contactName,
      call.contactInfo,
      call.externalId,
      call.units,
      call.unitCount,
      call.xmlStructure,
      call.enRouteTime,
      call.onSceneTime,
      call.atPatientTime,
      call.clearedTime,
      call.backInServiceTime,
      call.sftpStatus,
      call.xml
    ]);
    
    // Sort by logged on date (newest first)
    dataRows.sort((a, b) => new Date(b[2]) - new Date(a[2]));
    
    const allData = [headers, ...dataRows];
    
    // Clear existing data and write new data
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: 'Annual Call Report 2025!A:Z'
    });
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Annual Call Report 2025!A1',
      valueInputOption: 'RAW',
      resource: {
        values: allData
      }
    });
    
    console.log(`Annual report created with ${dataRows.length} calls`);
    
    // Log to main sheet
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Logs!A:E',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          'info',
          `Annual Call Report generated: ${dataRows.length} calls processed with complete data`,
          'ANNUAL_REPORT',
          'Full call history with XML and SFTP status tracking'
        ]]
      }
    });
  }

  async generateReport() {
    await this.initialize();
    await this.processAllCalls();
    await this.createAnnualReportSheet();
    
    console.log('\nAnnual Call Report Summary:');
    console.log('==========================');
    console.log(`Total calls processed: ${this.callsData.size}`);
    
    const singleUnitCalls = Array.from(this.callsData.values()).filter(call => call.unitCount === 1).length;
    const multiUnitCalls = Array.from(this.callsData.values()).filter(call => call.unitCount > 1).length;
    
    console.log(`Single unit calls: ${singleUnitCalls}`);
    console.log(`Multiple unit calls: ${multiUnitCalls}`);
    console.log('Report available in "Annual Call Report 2025" sheet');
  }
}

async function main() {
  try {
    const reporter = new AnnualCallReporter();
    await reporter.generateReport();
  } catch (error) {
    console.error('Annual report generation failed:', error.message);
  }
}

main();