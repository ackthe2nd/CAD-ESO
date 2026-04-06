/**
 * Final System Verification
 * Complete end-to-end testing of all system components
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

class SystemVerifier {
  constructor() {
    this.results = {
      resgridAuth: false,
      googleAuth: false,
      apiEndpoints: false,
      xmlGeneration: false,
      sheetsIntegration: false,
      fieldMapping: false,
      unitStructure: false,
      documentation: false
    };
    this.details = [];
  }

  log(message, success = true) {
    const status = success ? '✓' : '✗';
    console.log(`${status} ${message}`);
    this.details.push({ message, success, timestamp: new Date().toISOString() });
  }

  async testResgridAuth() {
    try {
      const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
        grant_type: 'password',
        username: process.env.RESGRID_USER,
        password: process.env.RESGRID_PASS
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      this.resgridToken = response.data.access_token;
      this.results.resgridAuth = true;
      this.log('Resgrid authentication successful');
      return true;
    } catch (error) {
      this.log(`Resgrid authentication failed: ${error.message}`, false);
      return false;
    }
  }

  async testGoogleAuth() {
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

      this.googleAuth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Test sheets access
      const sheets = google.sheets({ version: 'v4', auth: this.googleAuth });
      await sheets.spreadsheets.get({
        spreadsheetId: process.env.LOG_SHEET_ID
      });

      this.results.googleAuth = true;
      this.log('Google Sheets authentication successful');
      return true;
    } catch (error) {
      this.log(`Google authentication failed: ${error.message}`, false);
      return false;
    }
  }

  async testApiEndpoints() {
    try {
      // Test multiple API endpoints
      const endpoints = [
        { name: 'GetCall', url: `https://api.resgrid.com/api/v4/Calls/GetCall?callId=200893` },
        { name: 'GetCallExtraData', url: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=200893` },
        { name: 'GetAllUnitsInfos', url: `https://api.resgrid.com/api/v4/Units/GetAllUnitsInfos` }
      ];

      for (const endpoint of endpoints) {
        const response = await axios.get(endpoint.url, {
          headers: { 'Authorization': `Bearer ${this.resgridToken}` }
        });
        
        if (response.data && response.data.Data) {
          this.log(`${endpoint.name} endpoint working`);
        } else {
          throw new Error(`${endpoint.name} returned invalid data`);
        }
      }

      this.results.apiEndpoints = true;
      this.log('All API endpoints functioning correctly');
      return true;
    } catch (error) {
      this.log(`API endpoint test failed: ${error.message}`, false);
      return false;
    }
  }

  async testXMLGeneration() {
    try {
      // Test with authentic call data
      const [callResponse, extraResponse] = await Promise.all([
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=200893`, {
          headers: { 'Authorization': `Bearer ${this.resgridToken}` }
        }),
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=200893`, {
          headers: { 'Authorization': `Bearer ${this.resgridToken}` }
        })
      ]);

      const xml = generateXML(callResponse.data, extraResponse.data);
      
      // Validate XML structure
      const hasValidStructure = xml.includes('<?xml version="1.0" encoding="UTF-8"?>') &&
                               xml.includes('<CadIncident') &&
                               xml.includes('</CadIncident>');
      
      const hasUnitsWrapper = xml.includes('<Units>');
      const unitCount = (xml.match(/<Unit>/g) || []).length;
      const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1];

      if (hasValidStructure && callNature) {
        this.results.xmlGeneration = true;
        this.log(`XML generation successful (${xml.length} bytes, ${unitCount} units)`);
        this.testXml = xml;
        return true;
      } else {
        throw new Error('Invalid XML structure generated');
      }
    } catch (error) {
      this.log(`XML generation failed: ${error.message}`, false);
      return false;
    }
  }

  async testSheetsIntegration() {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.googleAuth });
      
      // Test write to Logs sheet
      const testEntry = [
        new Date().toISOString(),
        'info',
        'System verification test',
        'VERIFICATION',
        'Complete system test successful'
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.LOG_SHEET_ID,
        range: 'Logs!A:E',
        valueInputOption: 'RAW',
        resource: {
          values: [testEntry]
        }
      });

      this.results.sheetsIntegration = true;
      this.log('Google Sheets integration working');
      return true;
    } catch (error) {
      this.log(`Sheets integration failed: ${error.message}`, false);
      return false;
    }
  }

  testFieldMapping() {
    try {
      if (!this.testXml) {
        throw new Error('No XML available for field mapping test');
      }

      // Check critical field mappings
      const callNature = this.testXml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1];
      const incidentNumber = this.testXml.match(/<IncidentNumber>(.*?)<\/IncidentNumber>/)?.[1];
      const address = this.testXml.match(/<IncidentAddress1>(.*?)<\/IncidentAddress1>/)?.[1];
      const city = this.testXml.match(/<IncidentCity>(.*?)<\/IncidentCity>/)?.[1];
      const state = this.testXml.match(/<IncidentState>(.*?)<\/IncidentState>/)?.[1];

      const mappingCorrect = callNature === 'Altered Mental Status' &&
                            incidentNumber === '200893' &&
                            address && city && state;

      if (mappingCorrect) {
        this.results.fieldMapping = true;
        this.log('Field mapping validation successful');
        return true;
      } else {
        throw new Error('Field mapping validation failed');
      }
    } catch (error) {
      this.log(`Field mapping test failed: ${error.message}`, false);
      return false;
    }
  }

  testUnitStructure() {
    try {
      if (!this.testXml) {
        throw new Error('No XML available for unit structure test');
      }

      const hasUnitsWrapper = this.testXml.includes('<Units>');
      const unitElements = (this.testXml.match(/<Unit>/g) || []).length;
      const topLevelEmsUnit = this.testXml.split('<Units>')[0].includes('<EmsUnitCallSign>');

      // For multi-unit call (200893), should have Units wrapper and no top-level EmsUnitCallSign
      if (hasUnitsWrapper && unitElements === 2 && !topLevelEmsUnit) {
        this.results.unitStructure = true;
        this.log('Unit structure validation successful (nested multi-unit)');
        return true;
      } else {
        throw new Error('Unit structure validation failed');
      }
    } catch (error) {
      this.log(`Unit structure test failed: ${error.message}`, false);
      return false;
    }
  }

  testDocumentation() {
    try {
      const requiredFiles = [
        'README.md',
        'SETUP_GUIDE.md',
        'DEPLOYMENT_GUIDE.md',
        'API_REFERENCE.md',
        'FIELD_MAPPING_REFERENCE.md'
      ];

      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`Missing documentation file: ${file}`);
        }
      }

      this.results.documentation = true;
      this.log('Documentation files verified');
      return true;
    } catch (error) {
      this.log(`Documentation test failed: ${error.message}`, false);
      return false;
    }
  }

  generateReport() {
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(r => r).length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n=== SYSTEM VERIFICATION REPORT ===');
    console.log(`Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`);
    console.log(`Overall Status: ${passedTests === totalTests ? 'PASS' : 'FAIL'}`);
    
    console.log('\nComponent Status:');
    Object.entries(this.results).forEach(([component, status]) => {
      console.log(`  ${status ? '✓' : '✗'} ${component}: ${status ? 'PASS' : 'FAIL'}`);
    });

    return passedTests === totalTests;
  }

  async runVerification() {
    console.log('Starting comprehensive system verification...\n');

    await this.testResgridAuth();
    await this.testGoogleAuth();
    
    if (this.results.resgridAuth) {
      await this.testApiEndpoints();
      await this.testXMLGeneration();
    }
    
    if (this.results.googleAuth) {
      await this.testSheetsIntegration();
    }
    
    this.testFieldMapping();
    this.testUnitStructure();
    this.testDocumentation();

    return this.generateReport();
  }
}

async function main() {
  const verifier = new SystemVerifier();
  const success = await verifier.runVerification();
  
  if (success) {
    console.log('\n🎉 All systems verified and operational!');
    console.log('Ready for deployment package creation.');
  } else {
    console.log('\n❌ System verification failed. Check errors above.');
  }
}

main().catch(error => {
  console.error('Verification failed:', error.message);
});