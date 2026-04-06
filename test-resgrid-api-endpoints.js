/**
 * Test Resgrid API Endpoints
 * 
 * This script systematically tests various Resgrid API endpoints
 * to check their availability and determine which ones need additional parameters.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Base URL for all endpoints
const BASE_URL = 'https://api.resgrid.com/api/v4';

// List of endpoints to test
const endpoints = [
  // Authentication
  { name: 'Token Authentication', method: 'POST', path: '/Connect/token', params: 'grant_type=password', requiresAuth: false },
  
  // Call endpoints
  { name: 'Get Active Calls', method: 'GET', path: '/Calls/GetActiveCalls', params: '', requiresAuth: true },
  { name: 'Get Calls in Date Range', method: 'GET', path: '/Calls/GetCallsInDateRange', params: 'startDate=2025-05-01&endDate=2025-05-07', requiresAuth: true },
  { name: 'Get Call Extra Data', method: 'GET', path: '/Calls/GetCallExtraData', params: 'callId=198513', requiresAuth: true },
  
  // Unit status endpoints
  { name: 'Get Unit Status', method: 'GET', path: '/UnitStatus/GetUnitStatus', params: 'unitId=8826', requiresAuth: true },
  { name: 'Get All Unit Statuses', method: 'GET', path: '/UnitStatus/GetAllUnitStatuses', params: '', requiresAuth: true },
  { name: 'Get All Units', method: 'GET', path: '/Units/GetAllUnits', params: '', requiresAuth: true },
  { name: 'Get All Units Infos', method: 'GET', path: '/Units/GetAllUnitsInfos', params: '', requiresAuth: true },
  { name: 'Get Units Filter Options', method: 'GET', path: '/Units/GetUnitsFilterOptions', params: '', requiresAuth: true },
  
  // Status definition endpoints
  { name: 'Get All Unit Status Definitions', method: 'GET', path: '/Statuses/GetAllUnitStatuses', params: '', requiresAuth: true },
  { name: 'Get All Personnel Statuses', method: 'GET', path: '/Statuses/GetAllStatusesForPersonnel', params: '', requiresAuth: true },
  { name: 'Get All Personnel Staffings', method: 'GET', path: '/Statuses/GetAllStaffingsForPersonnel', params: '', requiresAuth: true },
  
  // Personnel endpoints
  { name: 'Get Personnel Info', method: 'GET', path: '/Personnel/GetPersonnelInfo', params: '', requiresAuth: true },
  { name: 'Get All Personnel Infos', method: 'GET', path: '/Personnel/GetAllPersonnelInfos', params: '', requiresAuth: true },
  { name: 'Get Personnel Filter Options', method: 'GET', path: '/Personnel/GetPersonnelFilterOptions', params: '', requiresAuth: true },
  { name: 'Get Current Personnel Status', method: 'GET', path: '/PersonnelStatuses/GetCurrentStatus', params: '', requiresAuth: true },
  
  // Dispatch endpoints
  { name: 'Get New Call Data', method: 'GET', path: '/Dispatch/GetNewCallData', params: '', requiresAuth: true },
  { name: 'Get Personnel For Call Grid', method: 'GET', path: '/Dispatch/GetPersonnelForCallGrid', params: '', requiresAuth: true },
  { name: 'Get Groups For Call Grid', method: 'GET', path: '/Dispatch/GetGroupsForCallGrid', params: '', requiresAuth: true },
  { name: 'Get Roles For Call Grid', method: 'GET', path: '/Dispatch/GetRolesForCallGrid', params: '', requiresAuth: true },
  { name: 'Get Call Templates', method: 'GET', path: '/Dispatch/GetCallTemplates', params: '', requiresAuth: true },
  
  // Other useful endpoints
  { name: 'Get All Call Types', method: 'GET', path: '/CallTypes/GetAllCallTypes', params: '', requiresAuth: true },
  { name: 'Get All Call Priorities', method: 'GET', path: '/CallPriorities/GetAllCallPriorites', params: '', requiresAuth: true },
  { name: 'Get All Call Protocols', method: 'GET', path: '/CallProtocols/GetAllCallProtocols', params: '', requiresAuth: true },
  { name: 'Get All Groups', method: 'GET', path: '/Groups/GetAllGroups', params: '', requiresAuth: true },
  { name: 'Get Unit Roles', method: 'GET', path: '/UnitRoles/GetAllUnitRolesAndAssignmentsForDepartment', params: '', requiresAuth: true }
];

// Function to get API token
async function getApiToken() {
  try {
    console.log('Getting Resgrid API token...');
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const response = await axios.post(`${BASE_URL}/Connect/token`, 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to test a single endpoint
async function testEndpoint(endpoint, token) {
  try {
    console.log(`\n📡 Testing: ${endpoint.name}`);
    console.log(`Method: ${endpoint.method}`);
    console.log(`URL: ${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`);
    
    const config = {
      headers: {}
    };
    
    if (endpoint.requiresAuth) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    config.headers['Accept'] = 'application/json';
    
    let response;
    if (endpoint.method === 'GET') {
      const url = `${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`;
      response = await axios.get(url, config);
    } else if (endpoint.method === 'POST') {
      response = await axios.post(`${BASE_URL}${endpoint.path}`, endpoint.params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...config.headers
        }
      });
    }
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    // Check if response has data
    if (response.data) {
      if (response.data.Data) {
        // For endpoints that follow the Resgrid pattern with a Data property
        if (Array.isArray(response.data.Data)) {
          console.log(`  Response contains an array with ${response.data.Data.length} items`);
          
          // Show sample of first item if it exists
          if (response.data.Data.length > 0) {
            const sampleKeys = Object.keys(response.data.Data[0]);
            console.log(`  Sample fields: ${sampleKeys.join(', ')}`);
          }
        } else if (typeof response.data.Data === 'object') {
          console.log(`  Response contains an object with ${Object.keys(response.data.Data).length} properties`);
          console.log(`  Properties: ${Object.keys(response.data.Data).join(', ')}`);
        } else {
          console.log(`  Response Data: ${JSON.stringify(response.data.Data).substring(0, 100)}...`);
        }
      } else {
        // For other response patterns
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: 'success',
      statusCode: response.status,
      notes: '',
      hasPagination: response.data && response.data.NextPageUrl !== undefined,
      dataType: response.data && response.data.Data ? 
                (Array.isArray(response.data.Data) ? 'array' : 'object') : 
                'unknown'
    };
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    let errorDetails = '';
    if (error.response) {
      console.error(`  Status code: ${error.response.status}`);
      
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          console.error(`  Response data: ${errorDetails.substring(0, 200)}`);
        } else {
          errorDetails = error.response.data;
          console.error(`  Response data: ${errorDetails.substring(0, 200)}`);
        }
      }
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: 'error',
      statusCode: error.response ? error.response.status : 0,
      notes: errorDetails,
      error: true,
      errorType: error.response ? 
                (error.response.status === 401 ? 'authorization' : 
                 error.response.status === 400 ? 'bad_request' : 
                 error.response.status === 404 ? 'not_found' : 'other') : 'network'
    };
  }
}

// Main function to test all endpoints
async function testAllEndpoints() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token, aborting endpoint tests');
    return;
  }
  
  const results = [];
  const successfulEndpoints = [];
  const failedEndpoints = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, token);
    results.push(result);
    
    if (result.status === 'success') {
      successfulEndpoints.push(result);
    } else {
      failedEndpoints.push(result);
    }
  }
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Successful: ${successfulEndpoints.length}`);
  console.log(`Failed: ${failedEndpoints.length}`);
  
  console.log('\n✅ SUCCESSFUL ENDPOINTS:');
  successfulEndpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.path})`);
  });
  
  console.log('\n❌ FAILED ENDPOINTS:');
  failedEndpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.path}): ${endpoint.statusCode} ${endpoint.errorType}`);
  });
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const outputFilename = `resgrid-api-test-results-${timestamp}.json`;
  fs.writeFileSync(outputFilename, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTested: results.length,
    successful: successfulEndpoints.length,
    failed: failedEndpoints.length,
    results
  }, null, 2));
  
  console.log(`\nDetailed results saved to ${outputFilename}`);
  
  // Generate markdown report specifically for failed endpoints
  let errorReport = `# Resgrid API Endpoint Test Failures\n\n`;
  errorReport += `Test run at: ${new Date().toLocaleString()}\n\n`;
  errorReport += `## Failed Endpoints (${failedEndpoints.length})\n\n`;
  
  failedEndpoints.forEach(endpoint => {
    errorReport += `### ${endpoint.endpoint}\n`;
    errorReport += `- **Path**: \`${endpoint.path}\`\n`;
    errorReport += `- **Status Code**: ${endpoint.statusCode}\n`;
    errorReport += `- **Error Type**: ${endpoint.errorType}\n`;
    if (endpoint.notes) {
      errorReport += `- **Error Details**: \`${endpoint.notes.substring(0, 200)}${endpoint.notes.length > 200 ? '...' : ''}\`\n`;
    }
    errorReport += `\n`;
  });
  
  const errorReportFilename = 'failed-endpoints-report.md';
  fs.writeFileSync(errorReportFilename, errorReport);
  console.log(`Failed endpoints report saved to ${errorReportFilename}`);
}

// Execute the tests
testAllEndpoints().catch(console.error);