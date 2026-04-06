/**
 * Test Resgrid API Endpoints with Required Parameters
 * 
 * This script tests Resgrid API endpoints that need specific parameters
 * like call IDs, unit IDs, and personnel IDs.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Base URL for all endpoints
const BASE_URL = 'https://api.resgrid.com/api/v4';

// Sample IDs to use for testing
const SAMPLE_CALL_ID = '198513';      // Known working call ID
const SAMPLE_UNIT_ID = '8826';        // Known working unit ID (numeric)
const SAMPLE_PERSONNEL_ID = '';       // Will be dynamically fetched

// List of specific endpoints to test with parameters
const endpoints = [
  // Call-specific endpoints
  { name: 'Get Call by ID', method: 'GET', path: '/Calls/GetCall', params: `callId=${SAMPLE_CALL_ID}`, requiresAuth: true },
  { name: 'Get Call Extra Data', method: 'GET', path: '/Calls/GetCallExtraData', params: `callId=${SAMPLE_CALL_ID}`, requiresAuth: true },
  { name: 'Get Call Notes', method: 'GET', path: '/Calls/GetCallNotes', params: `callId=${SAMPLE_CALL_ID}`, requiresAuth: true },
  { name: 'Get Calls in Date Range', method: 'GET', path: '/Calls/GetCallsInDateRange', params: 'startDate=2025-05-01&endDate=2025-05-07', requiresAuth: true },
  
  // Unit-specific endpoints
  { name: 'Get Unit Status by ID', method: 'GET', path: '/UnitStatus/GetUnitStatus', params: `unitId=${SAMPLE_UNIT_ID}`, requiresAuth: true },
  { name: 'Get Unit Details', method: 'GET', path: '/Units/GetUnit', params: `unitId=${SAMPLE_UNIT_ID}`, requiresAuth: true },
  
  // Getting all entities
  { name: 'Get All Units', method: 'GET', path: '/Units/GetAllUnits', params: '', requiresAuth: true },
  { name: 'Get All Call Types', method: 'GET', path: '/CallTypes/GetAllCallTypes', params: '', requiresAuth: true },
  { name: 'Get All Call Priorities', method: 'GET', path: '/CallPriorities/GetAllCallPriorites', params: '', requiresAuth: true },
  { name: 'Get All Call Protocols', method: 'GET', path: '/CallProtocols/GetAllCallProtocols', params: '', requiresAuth: true },
  { name: 'Get All Unit Status Definitions', method: 'GET', path: '/Statuses/GetAllUnitStatuses', params: '', requiresAuth: true },
  
  // Additional useful endpoints
  { name: 'Get Department Info', method: 'GET', path: '/Departments/GetDepartmentInfo', params: '', requiresAuth: true },
  { name: 'Get All Department Groups', method: 'GET', path: '/Groups/GetAllGroups', params: '', requiresAuth: true },
  { name: 'Get Autofills', method: 'GET', path: '/Autofills/GetAllAutofills', params: '', requiresAuth: true },
];

// Additional endpoints that will be dynamically added if we have personnel ID
const personnelEndpoints = [
  { name: 'Get Personnel Status', method: 'GET', path: '/PersonnelStatuses/GetPersonnelStatus', requiresAuth: true },
  { name: 'Get Personnel Details', method: 'GET', path: '/Personnel/GetPersonnel', requiresAuth: true },
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

// Function to get a sample personnel ID to use for testing
async function getSamplePersonnelId(token) {
  try {
    console.log('Looking for a valid personnel ID for testing...');
    const response = await axios.get(`${BASE_URL}/Personnel/GetAllPersonnelInfos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && response.data.Data.length > 0) {
      const sampleId = response.data.Data[0].UserId;
      console.log(`Found personnel ID: ${sampleId}`);
      return sampleId;
    }
  } catch (error) {
    console.error(`Failed to get sample personnel ID: ${error.message}`);
  }
  return '';
}

// Function to test a single endpoint
async function testEndpoint(endpoint, token) {
  try {
    console.log(`\n📡 Testing: ${endpoint.name}`);
    console.log(`Method: ${endpoint.method}`);
    console.log(`URL: ${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`);
    
    const config = {
      headers: {},
      timeout: 5000 // 5 second timeout for each request
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
        },
        timeout: 5000
      });
    }
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    // Check if response has data
    if (response.data) {
      if (response.data.Data !== undefined) {
        // For endpoints that follow the Resgrid pattern with a Data property
        if (Array.isArray(response.data.Data)) {
          console.log(`  Response contains an array with ${response.data.Data.length} items`);
          
          // Show sample of first item if it exists
          if (response.data.Data.length > 0) {
            const sampleKeys = Object.keys(response.data.Data[0]);
            console.log(`  Sample fields: ${sampleKeys.join(', ')}`);
          }
        } else if (typeof response.data.Data === 'object' && response.data.Data !== null) {
          console.log(`  Response contains an object with ${Object.keys(response.data.Data).length} properties`);
          console.log(`  Properties: ${Object.keys(response.data.Data).join(', ')}`);
        } else if (response.data.Data === null) {
          console.log(`  Response Data is null`);
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
      params: endpoint.params,
      status: 'success',
      statusCode: response.status,
      notes: '',
      hasPagination: response.data && response.data.NextPageUrl !== undefined,
      dataType: response.data && response.data.Data !== undefined ? 
                (Array.isArray(response.data.Data) ? 'array' : 
                 response.data.Data === null ? 'null' : 'object') : 
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
      params: endpoint.params,
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
  
  // Get a sample personnel ID if possible
  const personnelId = await getSamplePersonnelId(token);
  if (personnelId) {
    // Add personnel-specific endpoints with the personnel ID
    personnelEndpoints.forEach(endpoint => {
      endpoints.push({
        ...endpoint,
        params: `personnelId=${personnelId}`
      });
    });
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
    console.log(`- ${endpoint.endpoint} (${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''})`);
  });
  
  console.log('\n❌ FAILED ENDPOINTS:');
  failedEndpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}): ${endpoint.statusCode} ${endpoint.errorType}`);
  });
  
  // Generate markdown report for failed endpoints
  if (failedEndpoints.length > 0) {
    let errorReport = `# Resgrid API Endpoint Test Failures\n\n`;
    errorReport += `Test run at: ${new Date().toLocaleString()}\n\n`;
    errorReport += `## Failed Endpoints (${failedEndpoints.length})\n\n`;
    
    failedEndpoints.forEach(endpoint => {
      errorReport += `### ${endpoint.endpoint}\n`;
      errorReport += `- **Path**: \`${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}\`\n`;
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
  
  // Generate successful endpoints documentation for integration planning
  let integrationDoc = `# Resgrid API Integration Planning\n\n`;
  integrationDoc += `Test run at: ${new Date().toLocaleString()}\n\n`;
  integrationDoc += `## Working Endpoints (${successfulEndpoints.length})\n\n`;
  
  successfulEndpoints.forEach(endpoint => {
    integrationDoc += `### ${endpoint.endpoint}\n`;
    integrationDoc += `- **URL**: \`${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}\`\n`;
    integrationDoc += `- **Data Type**: ${endpoint.dataType}\n`;
    if (endpoint.hasPagination) {
      integrationDoc += `- **Pagination**: Supports pagination\n`;
    }
    integrationDoc += `\n`;
  });
  
  integrationDoc += `## Integration Planning\n\n`;
  integrationDoc += `Based on the available endpoints, here are the key integration points for connecting Resgrid with other systems:\n\n`;
  integrationDoc += `1. **Call Data Access**: Calls can be retrieved via GetActiveCalls (for active calls) and GetCall endpoints\n`;
  integrationDoc += `2. **Unit Status Tracking**: Unit statuses can be tracked via GetUnitStatus endpoint with unitId parameter\n`;
  integrationDoc += `3. **Personnel Information**: Personnel details are available through GetAllPersonnelInfos\n`;
  integrationDoc += `4. **Call Details and Activity**: Detailed call information is available through GetCallExtraData\n`;
  
  const planningFilename = 'resgrid-integration-planning.md';
  fs.writeFileSync(planningFilename, integrationDoc);
  console.log(`Integration planning document saved to ${planningFilename}`);
}

// Execute the tests
testAllEndpoints().catch(console.error);