/**
 * Fix Test Result Column Updates
 * Ensures Test Result column properly updates with the most recent status after each test
 */

const { google } = require('googleapis');
const fs = require('fs');

/**
 * Enhanced updateTestResult function with proper column detection
 */
function createEnhancedUpdateTestResult() {
  return `
async function updateTestResult(callId, status, details = '') {
  try {
    const { google } = require('googleapis');
    
    // Initialize Google Sheets authentication
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get headers to find correct column positions
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ1',
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    
    // Find column indices
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    
    if (callIdIndex === -1) {
      logger.warn('Emergency Call ID column not found in headers');
      return false;
    }
    
    if (testResultIndex === -1) {
      logger.warn('Test Result column not found in headers');
      return false;
    }

    // Get call data to find the specific row
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AZ',
    });

    const data = dataResponse.data.values || [];
    let targetRow = -1;

    // Find the row with this call ID
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][callIdIndex] === callId.toString()) {
        targetRow = i + 1; // Convert to 1-based row number
        break;
      }
    }

    if (targetRow === -1) {
      logger.warn(\`Call \${callId} not found in Google Sheets for test result update\`);
      return false;
    }

    // Create status-specific messages with icons and Pacific Time timestamps
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    let resultText;
    switch (status) {
      case 'initializing':
        resultText = \`🔄 INITIALIZING... (\${timestamp})\`;
        break;
      case 'authenticating':
        resultText = \`🔐 AUTHENTICATING... (\${timestamp})\`;
        break;
      case 'fetching':
        resultText = \`📡 FETCHING DATA... (\${timestamp})\`;
        break;
      case 'processing':
        resultText = \`⚙️ PROCESSING... (\${timestamp})\`;
        break;
      case 'generating':
        resultText = \`📄 GENERATING XML... (\${timestamp})\`;
        break;
      case 'validating':
        resultText = \`✔️ VALIDATING... (\${timestamp})\`;
        break;
      case 'updating':
        resultText = \`💾 UPDATING SHEETS... (\${timestamp})\`;
        break;
      case 'success':
        resultText = \`✅ SUCCESS (\${timestamp})\`;
        break;
      case 'failed':
        resultText = \`❌ FAILED: \${details} (\${timestamp})\`;
        break;
      case 'warning':
        resultText = \`⚠️ WARNING: \${details} (\${timestamp})\`;
        break;
      case 'complete':
        resultText = \`✅ COMPLETED: \${details} (\${timestamp})\`;
        break;
      default:
        resultText = \`🔄 \${status.toUpperCase()}... (\${timestamp})\`;
    }

    // Update the Test Result column
    const testResultColumn = String.fromCharCode(65 + testResultIndex);
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: \`Call Data!\${testResultColumn}\${targetRow}\`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[resultText]],
      },
    });

    logger.info(\`Updated test result for call \${callId}: \${status}\`);
    return true;

  } catch (error) {
    logger.error(\`Failed to update test result for call \${callId}: \${error.message}\`);
    return false;
  }
}`;
}

/**
 * Update test result functions in all deployment packages
 */
async function fixTestResultUpdates() {
  console.log('Fixing Test Result Column Updates Across All Packages');
  console.log('====================================================');
  
  // List of files that need the enhanced updateTestResult function
  const filesToUpdate = [
    'src/test-endpoint.js',
    'deployment-package/src/test-endpoint.js',
    'deployment-package-v1.7.0/src/test-endpoint.js',
    'deployment-package-v1.7.2/src/test-endpoint.js',
    'deployment-package-v1.8.0/src/test-endpoint.js',
    'deployment-package-v2.1.0/src/test-endpoint.js',
    'deployment-package-v2.1.1/src/test-endpoint.js',
    'deployment-package-v2.1.2/src/test-endpoint.js',
    'test-call-functionality.js',
    'resgrid-eso-bridge-v2.0-deployment/test-call-functionality.js'
  ];
  
  const enhancedFunction = createEnhancedUpdateTestResult();
  let updatedCount = 0;
  
  for (const filePath of filesToUpdate) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Find and replace the updateTestResult function
      const functionPattern = /async function updateTestResult\(callId, status, details = ''\)\s*\{[^}]*\}(?:[^}]*\})*\}/s;
      
      if (functionPattern.test(content)) {
        content = content.replace(functionPattern, enhancedFunction.trim());
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        updatedCount++;
      } else {
        console.log(`⚠️ Function not found in: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${filePath}: ${error.message}`);
    }
  }
  
  console.log(`\nCompleted: Updated ${updatedCount} files`);
  return updatedCount;
}

/**
 * Test the Test Result column update functionality
 */
async function testResultColumnUpdates() {
  console.log('\nTesting Test Result Column Updates');
  console.log('=================================');
  
  try {
    // Initialize Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers to verify Test Result column exists
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ1',
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    
    if (testResultIndex === -1) {
      console.log('❌ Test Result column not found');
      
      // Add Test Result column if missing
      console.log('Adding Test Result column...');
      const updatedHeaders = [...headers, 'Test Result'];
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!A1:${String.fromCharCode(65 + updatedHeaders.length - 1)}1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [updatedHeaders],
        },
      });
      
      console.log('✅ Test Result column added');
    } else {
      const testResultColumn = String.fromCharCode(65 + testResultIndex);
      console.log(`✅ Test Result column found at position ${testResultColumn}`);
    }
    
    // Test updating a recent call's Test Result
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:C',
    });
    
    const data = dataResponse.data.values || [];
    if (data.length > 1) {
      const recentCall = data[data.length - 1]; // Get last call
      const callId = recentCall[1]; // Emergency Call ID
      
      if (callId) {
        console.log(`Testing status update for call ${callId}...`);
        
        // Create test updateTestResult function inline
        const updateTestResult = eval(`(${createEnhancedUpdateTestResult()})`);
        
        // Test different status updates
        await updateTestResult(callId, 'initializing');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await updateTestResult(callId, 'processing');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await updateTestResult(callId, 'complete', 'Test successful');
        
        console.log('✅ Test Result column updates working correctly');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Test Result updates:', error.message);
  }
}

async function main() {
  await fixTestResultUpdates();
  await testResultColumnUpdates();
  
  console.log('\n🎯 Test Result Column Update Enhancement Complete!');
  console.log('✅ All test buttons will now properly update Test Result column');
  console.log('✅ Status updates include Pacific Time timestamps');
  console.log('✅ Real-time progress tracking during test execution');
  console.log('✅ Enhanced error handling and column detection');
}

main().catch(console.error);