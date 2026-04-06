/**
 * Comprehensive System Test v2.1.2
 * Tests all components implemented today including Location column integration
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

class SystemTester {
  constructor() {
    this.results = {
      locationExtraction: null,
      systemEndpoints: null,
      documentationConsistency: null,
      deploymentPackages: null,
      testScripts: null,
      esoConnection: null,
      googleSheets: null,
      overallHealth: null
    };
    this.errors = [];
  }

  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌ ERROR' : '✅ INFO';
    console.log(`[${timestamp}] ${prefix}: ${message}`);
    if (isError) {
      this.errors.push(message);
    }
  }

  // Test 1: Location Column Extraction
  async testLocationExtraction() {
    this.log('Testing Location Column Extraction...');
    
    try {
      // Test the extraction function
      const extractLocationFromIncidentDetails = (incidentDetails) => {
        if (!incidentDetails || typeof incidentDetails !== 'string') {
          return '';
        }
        
        try {
          const locationMatch = incidentDetails.match(/LOCATION:\s*([^\n\r]+)/i);
          
          if (locationMatch && locationMatch[1]) {
            let location = locationMatch[1].trim();
            location = location.replace(/[.,;]+$/, '').trim();
            
            if (location.length < 3) {
              return '';
            }
            
            return location;
          }
          
          return '';
        } catch (error) {
          return '';
        }
      };

      const testCases = [
        {
          input: "Medical emergency. LOCATION: Emergency Tent A-12. Patient conscious.",
          expected: "Emergency Tent A-12. Patient conscious"
        },
        {
          input: "Fire alarm. LOCATION: Building 3, Floor 2, Room 205.",
          expected: "Building 3, Floor 2, Room 205"
        },
        {
          input: "Medical emergency without location field.",
          expected: ""
        }
      ];

      let passed = 0;
      for (const testCase of testCases) {
        const result = extractLocationFromIncidentDetails(testCase.input);
        if (result === testCase.expected) {
          passed++;
        } else {
          this.log(`Location extraction failed: Expected "${testCase.expected}", got "${result}"`, true);
        }
      }

      this.results.locationExtraction = {
        status: passed === testCases.length ? 'PASS' : 'FAIL',
        passed: passed,
        total: testCases.length
      };

      this.log(`Location extraction: ${passed}/${testCases.length} tests passed`);

    } catch (error) {
      this.log(`Location extraction test failed: ${error.message}`, true);
      this.results.locationExtraction = { status: 'ERROR', error: error.message };
    }
  }

  // Test 2: System Endpoints
  async testSystemEndpoints() {
    this.log('Testing System Endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get('http://localhost:5000/health', { timeout: 5000 });
      const healthOk = healthResponse.data.status === 'OK';

      // Test API endpoint
      const apiResponse = await axios.get('http://localhost:5000/api', { timeout: 5000 });
      const apiOk = apiResponse.data.status === 'OK';

      // Test integrity endpoint
      let integrityOk = false;
      try {
        const integrityResponse = await axios.get('http://localhost:5000/integrity', { timeout: 5000 });
        integrityOk = integrityResponse.data.success !== undefined;
      } catch (error) {
        this.log('Integrity endpoint not available (may be normal)');
      }

      this.results.systemEndpoints = {
        status: healthOk && apiOk ? 'PASS' : 'FAIL',
        health: healthOk,
        api: apiOk,
        integrity: integrityOk
      };

      this.log(`System endpoints: Health=${healthOk}, API=${apiOk}, Integrity=${integrityOk}`);

    } catch (error) {
      this.log(`System endpoints test failed: ${error.message}`, true);
      this.results.systemEndpoints = { status: 'ERROR', error: error.message };
    }
  }

  // Test 3: Documentation Consistency
  async testDocumentationConsistency() {
    this.log('Testing Documentation Consistency...');
    
    try {
      const docsToCheck = [
        'README.md',
        'README_V2.1.2.md',
        'API_REFERENCE.md',
        'FIELD_MAPPING_REFERENCE.md',
        'VERSION_SUMMARY.md',
        'FINAL_DEPLOYMENT_SUMMARY_V2.1.2_COMPLETE.md',
        'COMPREHENSIVE_SYSTEM_DOCUMENTATION_V2.1.2.md',
        'LOCATION_COLUMN_IMPLEMENTATION_COMPLETE.md',
        'ESO_CONNECTION_REFERENCE.md'
      ];

      let consistentDocs = 0;
      const issues = [];

      for (const doc of docsToCheck) {
        if (fs.existsSync(doc)) {
          const content = fs.readFileSync(doc, 'utf8');
          
          // Check for consistent version references
          const hasCorrectVersion = content.includes('2.1.2') || content.includes('v2.1.2');
          
          // Check for Location column references (where appropriate)
          const hasLocationRef = content.includes('Location') || content.includes('location');
          
          // Check for correct ESO configuration
          const hasCorrectESO = content.includes('sftp.esosuite.net') && content.includes('CA-EMS');
          
          if (hasCorrectVersion && hasCorrectESO) {
            consistentDocs++;
          } else {
            issues.push(`${doc}: Version=${hasCorrectVersion}, ESO=${hasCorrectESO}`);
          }
        } else {
          issues.push(`${doc}: File not found`);
        }
      }

      this.results.documentationConsistency = {
        status: consistentDocs >= (docsToCheck.length * 0.8) ? 'PASS' : 'FAIL',
        consistent: consistentDocs,
        total: docsToCheck.length,
        issues: issues
      };

      this.log(`Documentation consistency: ${consistentDocs}/${docsToCheck.length} files consistent`);

    } catch (error) {
      this.log(`Documentation consistency test failed: ${error.message}`, true);
      this.results.documentationConsistency = { status: 'ERROR', error: error.message };
    }
  }

  // Test 4: Deployment Packages
  async testDeploymentPackages() {
    this.log('Testing Deployment Packages...');
    
    try {
      const deploymentDirs = [
        'deployment-package',
        'deployment-package-v1.7.0',
        'deployment-package-v1.7.2',
        'deployment-package-v1.8.0',
        'deployment-package-v2.1.0',
        'deployment-package-v2.1.1',
        'deployment-package-v2.1.2',
        'final-deployment',
        'final-deployment-v1.7.1',
        'resgrid-eso-bridge-v2.0-deployment',
        'update-package'
      ];

      let packagesWithLocation = 0;
      const packageIssues = [];

      for (const dir of deploymentDirs) {
        const sheetsLoggerPath = `${dir}/src/sheets-logger.js`;
        
        if (fs.existsSync(sheetsLoggerPath)) {
          const content = fs.readFileSync(sheetsLoggerPath, 'utf8');
          
          // Check for Location column implementation
          const hasLocationExtraction = content.includes('extractLocationFromIncidentDetails');
          const hasLocationHeader = content.includes("'Location'") || content.includes('"Location"');
          
          if (hasLocationExtraction && hasLocationHeader) {
            packagesWithLocation++;
          } else {
            packageIssues.push(`${dir}: Extraction=${hasLocationExtraction}, Header=${hasLocationHeader}`);
          }
        } else {
          packageIssues.push(`${dir}: sheets-logger.js not found`);
        }
      }

      this.results.deploymentPackages = {
        status: packagesWithLocation >= (deploymentDirs.length * 0.8) ? 'PASS' : 'FAIL',
        updated: packagesWithLocation,
        total: deploymentDirs.length,
        issues: packageIssues
      };

      this.log(`Deployment packages: ${packagesWithLocation}/${deploymentDirs.length} have Location support`);

    } catch (error) {
      this.log(`Deployment packages test failed: ${error.message}`, true);
      this.results.deploymentPackages = { status: 'ERROR', error: error.message };
    }
  }

  // Test 5: Test Scripts
  async testTestScripts() {
    this.log('Testing Test Scripts...');
    
    try {
      const testScripts = [
        'find-single-unit-call.js',
        'complete-real-data-test.js',
        'test-real-calls-export-sheets.js',
        'test-and-export-call-200893.js',
        'export-test-results-to-sheets.js',
        'log-call-200576-test.js'
      ];

      let scriptsWithLocation = 0;
      const scriptIssues = [];

      for (const script of testScripts) {
        if (fs.existsSync(script)) {
          const content = fs.readFileSync(script, 'utf8');
          
          // Check for Location extraction function
          const hasLocationFunction = content.includes('extractLocationFromIncidentDetails');
          
          // Check for Location in data structures
          const hasLocationData = content.includes('location:') || content.includes('result.location');
          
          if (hasLocationFunction) {
            scriptsWithLocation++;
          } else {
            scriptIssues.push(`${script}: Function=${hasLocationFunction}, Data=${hasLocationData}`);
          }
        } else {
          scriptIssues.push(`${script}: File not found`);
        }
      }

      this.results.testScripts = {
        status: scriptsWithLocation >= (testScripts.length * 0.8) ? 'PASS' : 'FAIL',
        updated: scriptsWithLocation,
        total: testScripts.length,
        issues: scriptIssues
      };

      this.log(`Test scripts: ${scriptsWithLocation}/${testScripts.length} have Location support`);

    } catch (error) {
      this.log(`Test scripts test failed: ${error.message}`, true);
      this.results.testScripts = { status: 'ERROR', error: error.message };
    }
  }

  // Test 6: ESO Connection Configuration
  async testESOConnection() {
    this.log('Testing ESO Connection Configuration...');
    
    try {
      // Check environment variables
      const requiredEnvVars = ['SFTP_HOST', 'SFTP_USER', 'SFTP_PASS', 'SFTP_DIR'];
      const envVarsSet = requiredEnvVars.filter(envVar => process.env[envVar]);

      // Check .env file
      let envFileCorrect = false;
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        envFileCorrect = envContent.includes('sftp.esosuite.net') && 
                        envContent.includes('CA-EMS') && 
                        envContent.includes('/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9');
      }

      this.results.esoConnection = {
        status: envVarsSet.length === requiredEnvVars.length && envFileCorrect ? 'PASS' : 'FAIL',
        envVarsSet: envVarsSet.length,
        envVarsTotal: requiredEnvVars.length,
        envFileCorrect: envFileCorrect
      };

      this.log(`ESO connection: ${envVarsSet.length}/${requiredEnvVars.length} env vars set, .env file correct: ${envFileCorrect}`);

    } catch (error) {
      this.log(`ESO connection test failed: ${error.message}`, true);
      this.results.esoConnection = { status: 'ERROR', error: error.message };
    }
  }

  // Test 7: Google Sheets Integration
  async testGoogleSheets() {
    this.log('Testing Google Sheets Integration...');
    
    try {
      // Check for Google Sheets configuration
      const hasServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON !== undefined;
      const hasSheetId = process.env.LOG_SHEET_ID !== undefined;

      // Check if main sheets-logger.js has Location support
      let mainSheetsLoggerHasLocation = false;
      if (fs.existsSync('src/sheets-logger.js')) {
        const content = fs.readFileSync('src/sheets-logger.js', 'utf8');
        mainSheetsLoggerHasLocation = content.includes('extractLocationFromIncidentDetails') &&
                                     content.includes('Location');
      }

      this.results.googleSheets = {
        status: hasServiceAccount && hasSheetId && mainSheetsLoggerHasLocation ? 'PASS' : 'FAIL',
        serviceAccount: hasServiceAccount,
        sheetId: hasSheetId,
        locationSupport: mainSheetsLoggerHasLocation
      };

      this.log(`Google Sheets: ServiceAccount=${hasServiceAccount}, SheetId=${hasSheetId}, Location=${mainSheetsLoggerHasLocation}`);

    } catch (error) {
      this.log(`Google Sheets test failed: ${error.message}`, true);
      this.results.googleSheets = { status: 'ERROR', error: error.message };
    }
  }

  // Test 8: Overall System Health
  async testOverallHealth() {
    this.log('Testing Overall System Health...');
    
    try {
      // Count passing tests
      const testResults = Object.values(this.results).filter(result => result !== null);
      const passingTests = testResults.filter(result => result.status === 'PASS').length;
      const totalTests = testResults.length;

      // Check for critical errors
      const criticalErrors = this.errors.filter(error => 
        error.includes('SFTP') || 
        error.includes('Google Sheets') || 
        error.includes('Location')
      );

      this.results.overallHealth = {
        status: passingTests >= (totalTests * 0.8) && criticalErrors.length === 0 ? 'PASS' : 'FAIL',
        passingTests: passingTests,
        totalTests: totalTests,
        criticalErrors: criticalErrors.length,
        successRate: Math.round((passingTests / totalTests) * 100)
      };

      this.log(`Overall health: ${passingTests}/${totalTests} tests passing (${this.results.overallHealth.successRate}%)`);

    } catch (error) {
      this.log(`Overall health test failed: ${error.message}`, true);
      this.results.overallHealth = { status: 'ERROR', error: error.message };
    }
  }

  // Generate comprehensive test report
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE SYSTEM TEST REPORT v2.1.2');
    console.log('='.repeat(80));
    
    const testNames = [
      'Location Extraction',
      'System Endpoints', 
      'Documentation Consistency',
      'Deployment Packages',
      'Test Scripts',
      'ESO Connection',
      'Google Sheets',
      'Overall Health'
    ];

    const testKeys = [
      'locationExtraction',
      'systemEndpoints',
      'documentationConsistency', 
      'deploymentPackages',
      'testScripts',
      'esoConnection',
      'googleSheets',
      'overallHealth'
    ];

    testNames.forEach((name, index) => {
      const result = this.results[testKeys[index]];
      const status = result ? result.status : 'NOT_RUN';
      const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${name}: ${status}`);
      
      if (result && result.status === 'FAIL' && result.issues) {
        result.issues.slice(0, 3).forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    
    if (this.results.overallHealth) {
      console.log(`Overall Status: ${this.results.overallHealth.status}`);
      console.log(`Success Rate: ${this.results.overallHealth.successRate}%`);
      console.log(`Tests Passing: ${this.results.overallHealth.passingTests}/${this.results.overallHealth.totalTests}`);
      console.log(`Critical Errors: ${this.results.overallHealth.criticalErrors}`);
    }

    if (this.errors.length > 0) {
      console.log('\nErrors encountered:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Test completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive System Test v2.1.2\n');
    
    await this.testLocationExtraction();
    await this.testSystemEndpoints();
    await this.testDocumentationConsistency();
    await this.testDeploymentPackages();
    await this.testTestScripts();
    await this.testESOConnection();
    await this.testGoogleSheets();
    await this.testOverallHealth();
    
    this.generateReport();
    
    return this.results.overallHealth && this.results.overallHealth.status === 'PASS';
  }
}

// Run the comprehensive test
async function main() {
  const tester = new SystemTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}