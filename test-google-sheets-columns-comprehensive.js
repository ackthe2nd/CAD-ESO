/**
 * Comprehensive Google Sheets Column Update Test
 * Verifies all Call Data tab columns are updating correctly including Test Result and Location
 */

require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

class GoogleSheetsColumnTester {
  constructor() {
    this.sheetsClient = null;
    this.spreadsheetId = process.env.LOG_SHEET_ID;
    this.results = {
      columnStructure: null,
      locationColumn: null,
      testResultColumn: null,
      recentUpdates: null,
      dataIntegrity: null
    };
  }

  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌ ERROR' : '✅ INFO';
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }

  async initialize() {
    try {
      this.log('Initializing Google Sheets connection...');
      
      const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      const authClient = await auth.getClient();
      this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
      
      this.log('Google Sheets connection initialized successfully');
      return true;
    } catch (error) {
      this.log(`Failed to initialize Google Sheets: ${error.message}`, true);
      return false;
    }
  }

  async testColumnStructure() {
    this.log('Testing Google Sheets column structure...');
    
    try {
      // Get the header row to verify column structure
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!1:1'
      });

      const headers = response.data.values[0] || [];
      
      // Expected columns based on our complete implementation
      const expectedColumns = [
        'Call Received Time',
        'Emergency Call ID', 
        'Priority Description',
        'Responding Units',
        'Call Title',
        'Incident Type',
        'Incident Details',
        'Emergency Address',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'ZIP Code',
        'GPS Latitude',
        'GPS Longitude',
        'Additional Notes',
        'Patient/Caller Name',
        'Contact Information',
        'Patient DOB',
        'Call Closed Time',
        'Record Created',
        'Last Updated',
        'Number of Units',
        'Unit Dispatched Times',
        'Unit En Route Times',
        'Unit Arrived Times',
        'Unit At Patient Times',
        'Unit Cleared Times',
        'Unit Back In Service Times',
        'Unit Transport Times',
        'Unit At Hospital Times',
        'Call Closed',
        'Response Mode',
        'Priority Level',
        'Generated XML',
        'ESO Upload Status',
        'Test Call',
        'Test Result',
        'Location'
      ];

      let structureCorrect = true;
      const missingColumns = [];
      const extraColumns = [];

      // Check for missing expected columns
      for (const expectedCol of expectedColumns) {
        if (!headers.includes(expectedCol)) {
          missingColumns.push(expectedCol);
          structureCorrect = false;
        }
      }

      // Check for unexpected extra columns
      for (const header of headers) {
        if (!expectedColumns.includes(header)) {
          extraColumns.push(header);
        }
      }

      this.results.columnStructure = {
        status: structureCorrect ? 'PASS' : 'FAIL',
        totalColumns: headers.length,
        expectedColumns: expectedColumns.length,
        missingColumns: missingColumns,
        extraColumns: extraColumns,
        headers: headers
      };

      this.log(`Column structure: ${headers.length} columns found, ${expectedColumns.length} expected`);
      
      if (missingColumns.length > 0) {
        this.log(`Missing columns: ${missingColumns.join(', ')}`, true);
      }
      
      if (extraColumns.length > 0) {
        this.log(`Extra columns: ${extraColumns.join(', ')}`);
      }

    } catch (error) {
      this.log(`Column structure test failed: ${error.message}`, true);
      this.results.columnStructure = { status: 'ERROR', error: error.message };
    }
  }

  async testLocationColumn() {
    this.log('Testing Location column functionality...');
    
    try {
      // Get recent data to check Location column
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!A1:AM50' // Get first 50 rows including Location column (AM)
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      const locationColumnIndex = headers.indexOf('Location');

      if (locationColumnIndex === -1) {
        this.results.locationColumn = {
          status: 'FAIL',
          error: 'Location column not found in headers'
        };
        this.log('Location column not found in headers', true);
        return;
      }

      // Check for Location data in recent rows
      let locationDataFound = 0;
      let totalDataRows = 0;
      const locationSamples = [];

      for (let i = 1; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (row && row.length > 1) { // Has data
          totalDataRows++;
          const locationValue = row[locationColumnIndex];
          if (locationValue && locationValue.trim() !== '') {
            locationDataFound++;
            locationSamples.push({
              callId: row[1] || 'Unknown',
              location: locationValue
            });
          }
        }
      }

      this.results.locationColumn = {
        status: 'PASS',
        columnIndex: locationColumnIndex,
        columnLetter: String.fromCharCode(65 + locationColumnIndex),
        dataRows: totalDataRows,
        locationsFound: locationDataFound,
        samples: locationSamples.slice(0, 3)
      };

      this.log(`Location column found at index ${locationColumnIndex} (column ${String.fromCharCode(65 + locationColumnIndex)})`);
      this.log(`Location data found in ${locationDataFound}/${totalDataRows} recent rows`);

    } catch (error) {
      this.log(`Location column test failed: ${error.message}`, true);
      this.results.locationColumn = { status: 'ERROR', error: error.message };
    }
  }

  async testTestResultColumn() {
    this.log('Testing Test Result column functionality...');
    
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!A1:AM50'
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      const testResultColumnIndex = headers.indexOf('Test Result');
      const testCallColumnIndex = headers.indexOf('Test Call');

      if (testResultColumnIndex === -1) {
        this.results.testResultColumn = {
          status: 'FAIL',
          error: 'Test Result column not found in headers'
        };
        this.log('Test Result column not found in headers', true);
        return;
      }

      // Check for Test Result data
      let testResultDataFound = 0;
      let testCallsFound = 0;
      const testSamples = [];

      for (let i = 1; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (row && row.length > 1) {
          const testCallValue = row[testCallColumnIndex];
          const testResultValue = row[testResultColumnIndex];
          
          if (testCallValue && testCallValue.toString().toLowerCase() === 'true') {
            testCallsFound++;
            if (testResultValue && testResultValue.trim() !== '') {
              testResultDataFound++;
              testSamples.push({
                callId: row[1] || 'Unknown',
                testResult: testResultValue
              });
            }
          }
        }
      }

      this.results.testResultColumn = {
        status: 'PASS',
        columnIndex: testResultColumnIndex,
        columnLetter: String.fromCharCode(65 + testResultColumnIndex),
        testCalls: testCallsFound,
        testResults: testResultDataFound,
        samples: testSamples.slice(0, 3)
      };

      this.log(`Test Result column found at index ${testResultColumnIndex} (column ${String.fromCharCode(65 + testResultColumnIndex)})`);
      this.log(`Test calls found: ${testCallsFound}, Test results found: ${testResultDataFound}`);

    } catch (error) {
      this.log(`Test Result column test failed: ${error.message}`, true);
      this.results.testResultColumn = { status: 'ERROR', error: error.message };
    }
  }

  async testRecentUpdates() {
    this.log('Testing recent data updates...');
    
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!A1:AM10' // Get recent 10 rows
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      
      // Key columns to check for updates
      const keyColumns = {
        'Emergency Call ID': headers.indexOf('Emergency Call ID'),
        'Last Updated': headers.indexOf('Last Updated'),
        'ESO Upload Status': headers.indexOf('ESO Upload Status'),
        'Test Result': headers.indexOf('Test Result'),
        'Location': headers.indexOf('Location')
      };

      let recentUpdates = 0;
      const updateSamples = [];

      for (let i = 1; i < Math.min(rows.length, 6); i++) {
        const row = rows[i];
        if (row && row.length > 1) {
          const callId = row[keyColumns['Emergency Call ID']];
          const lastUpdated = row[keyColumns['Last Updated']];
          const esoStatus = row[keyColumns['ESO Upload Status']];
          const testResult = row[keyColumns['Test Result']];
          const location = row[keyColumns['Location']];

          if (lastUpdated) {
            const updateTime = new Date(lastUpdated);
            const now = new Date();
            const hoursSinceUpdate = (now - updateTime) / (1000 * 60 * 60);

            if (hoursSinceUpdate < 24) { // Updated within last 24 hours
              recentUpdates++;
              updateSamples.push({
                callId: callId,
                lastUpdated: lastUpdated,
                esoStatus: esoStatus || 'N/A',
                testResult: testResult || 'N/A',
                location: location || 'N/A',
                hoursAgo: Math.round(hoursSinceUpdate * 10) / 10
              });
            }
          }
        }
      }

      this.results.recentUpdates = {
        status: recentUpdates > 0 ? 'PASS' : 'FAIL',
        recentUpdates: recentUpdates,
        samples: updateSamples
      };

      this.log(`Recent updates found: ${recentUpdates} calls updated in last 24 hours`);

    } catch (error) {
      this.log(`Recent updates test failed: ${error.message}`, true);
      this.results.recentUpdates = { status: 'ERROR', error: error.message };
    }
  }

  async testDataIntegrity() {
    this.log('Testing data integrity across all columns...');
    
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Call Data!A1:AM10'
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      
      let integrityIssues = [];
      let wellFormedRows = 0;

      for (let i = 1; i < Math.min(rows.length, 6); i++) {
        const row = rows[i];
        if (row && row.length > 1) {
          const callId = row[1]; // Emergency Call ID
          
          // Check critical fields
          const criticalFields = {
            'Call ID': row[1],
            'Call Title': row[4],
            'Emergency Address': row[7],
            'City': row[10],
            'Generated XML': row[34],
            'ESO Upload Status': row[35]
          };

          let rowIsWellFormed = true;
          for (const [fieldName, value] of Object.entries(criticalFields)) {
            if (!value || value.toString().trim() === '') {
              integrityIssues.push(`Call ${callId}: Missing ${fieldName}`);
              rowIsWellFormed = false;
            }
          }

          if (rowIsWellFormed) {
            wellFormedRows++;
          }
        }
      }

      this.results.dataIntegrity = {
        status: integrityIssues.length === 0 ? 'PASS' : 'WARN',
        wellFormedRows: wellFormedRows,
        totalRows: Math.min(rows.length - 1, 5),
        issues: integrityIssues.slice(0, 5)
      };

      this.log(`Data integrity: ${wellFormedRows}/${Math.min(rows.length - 1, 5)} rows well-formed`);
      
      if (integrityIssues.length > 0) {
        this.log(`Data integrity issues found: ${integrityIssues.length}`, true);
      }

    } catch (error) {
      this.log(`Data integrity test failed: ${error.message}`, true);
      this.results.dataIntegrity = { status: 'ERROR', error: error.message };
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('GOOGLE SHEETS COLUMNS COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));
    
    const tests = [
      { name: 'Column Structure', key: 'columnStructure' },
      { name: 'Location Column', key: 'locationColumn' },
      { name: 'Test Result Column', key: 'testResultColumn' },
      { name: 'Recent Updates', key: 'recentUpdates' },
      { name: 'Data Integrity', key: 'dataIntegrity' }
    ];

    tests.forEach(test => {
      const result = this.results[test.key];
      const status = result ? result.status : 'NOT_RUN';
      const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${test.name}: ${status}`);
      
      if (result && result.status !== 'PASS' && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '-'.repeat(80));
    console.log('DETAILED RESULTS');
    console.log('-'.repeat(80));

    // Column Structure Details
    if (this.results.columnStructure) {
      const cs = this.results.columnStructure;
      console.log(`\nColumn Structure:`);
      console.log(`  Total columns: ${cs.totalColumns}`);
      console.log(`  Expected columns: ${cs.expectedColumns}`);
      if (cs.missingColumns && cs.missingColumns.length > 0) {
        console.log(`  Missing: ${cs.missingColumns.join(', ')}`);
      }
      if (cs.extraColumns && cs.extraColumns.length > 0) {
        console.log(`  Extra: ${cs.extraColumns.join(', ')}`);
      }
    }

    // Location Column Details
    if (this.results.locationColumn && this.results.locationColumn.status === 'PASS') {
      const lc = this.results.locationColumn;
      console.log(`\nLocation Column:`);
      console.log(`  Position: Column ${lc.columnLetter} (index ${lc.columnIndex})`);
      console.log(`  Data found: ${lc.locationsFound}/${lc.dataRows} rows`);
      if (lc.samples && lc.samples.length > 0) {
        console.log(`  Sample locations:`);
        lc.samples.forEach(sample => {
          console.log(`    Call ${sample.callId}: "${sample.location}"`);
        });
      }
    }

    // Test Result Column Details
    if (this.results.testResultColumn && this.results.testResultColumn.status === 'PASS') {
      const tr = this.results.testResultColumn;
      console.log(`\nTest Result Column:`);
      console.log(`  Position: Column ${tr.columnLetter} (index ${tr.columnIndex})`);
      console.log(`  Test calls: ${tr.testCalls}, Test results: ${tr.testResults}`);
      if (tr.samples && tr.samples.length > 0) {
        console.log(`  Sample test results:`);
        tr.samples.forEach(sample => {
          console.log(`    Call ${sample.callId}: "${sample.testResult}"`);
        });
      }
    }

    // Recent Updates Details
    if (this.results.recentUpdates && this.results.recentUpdates.status === 'PASS') {
      const ru = this.results.recentUpdates;
      console.log(`\nRecent Updates:`);
      console.log(`  Updated in last 24h: ${ru.recentUpdates} calls`);
      if (ru.samples && ru.samples.length > 0) {
        console.log(`  Recent updates:`);
        ru.samples.forEach(sample => {
          console.log(`    Call ${sample.callId}: ${sample.hoursAgo}h ago`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Test completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
  }

  async runAllTests() {
    console.log('🚀 Starting Google Sheets Columns Comprehensive Test\n');
    
    if (!(await this.initialize())) {
      console.log('❌ Failed to initialize Google Sheets connection');
      return false;
    }

    await this.testColumnStructure();
    await this.testLocationColumn();
    await this.testTestResultColumn();
    await this.testRecentUpdates();
    await this.testDataIntegrity();
    
    this.generateReport();
    
    // Calculate overall success
    const results = Object.values(this.results);
    const passCount = results.filter(r => r && r.status === 'PASS').length;
    const totalCount = results.filter(r => r !== null).length;
    
    return passCount >= (totalCount * 0.8); // 80% pass rate
  }
}

async function main() {
  const tester = new GoogleSheetsColumnTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}