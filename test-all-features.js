/**
 * Comprehensive API Testing Script
 * 
 * This script tests all critical Resgrid API endpoints for integration
 * and verifies that our documentation is accurate.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Base URL for all endpoints
const BASE_URL = 'https://api.resgrid.com/api/v4';

// Sample IDs for testing from previous successful runs
const SAMPLE_CALL_ID = '198513';
const SAMPLE_UNIT_ID = '8826';
const SAMPLE_USER_ID = 'F1457F34-94B7-402A-964A-7FE4BCC198F7';

// Create a comprehensive list of all endpoints to test
const endpoints = [
  // Authentication
  { 
    name: 'Authentication Token', 
    method: 'POST', 
    path: '/Connect/token', 
    body: `grant_type=password&username=${process.env.RESGRID_USER}&password=${process.env.RESGRID_PASS}`, 
    requiresAuth: false,
    contentType: 'application/x-www-form-urlencoded',
    category: 'Authentication',
    description: 'Get an authentication token for API access'
  },

  // Call Endpoints
  { 
    name: 'Get Active Calls', 
    method: 'GET', 
    path: '/Calls/GetActiveCalls', 
    params: '', 
    requiresAuth: true,
    category: 'Calls',
    description: 'Get all active calls'
  },
  { 
    name: 'Get Call by ID', 
    method: 'GET', 
    path: '/Calls/GetCall', 
    params: `callId=${SAMPLE_CALL_ID}`, 
    requiresAuth: true,
    category: 'Calls',
    description: 'Get detailed information about a specific call'
  },
  { 
    name: 'Get Call Extra Data', 
    method: 'GET', 
    path: '/Calls/GetCallExtraData', 
    params: `callId=${SAMPLE_CALL_ID}`, 
    requiresAuth: true,
    category: 'Calls',
    description: 'Get additional data for a call including unit activities'
  },
  { 
    name: 'Get Calls in Date Range', 
    method: 'GET', 
    path: '/Calls/GetCalls', 
    params: 'startDate=2025-05-04%2012%3A47%3A44&endDate=2025-05-05%2020%3A43%3A22', 
    requiresAuth: true,
    category: 'Calls',
    description: 'Get calls within a specific date range'
  },

  // Unit Status Endpoints
  { 
    name: 'Get Unit Status by ID', 
    method: 'GET', 
    path: '/UnitStatus/GetUnitStatus', 
    params: `unitId=${SAMPLE_UNIT_ID}`, 
    requiresAuth: true,
    category: 'Unit Status',
    description: 'Get the current status of a specific unit'
  },
  { 
    name: 'Get All Unit Statuses', 
    method: 'GET', 
    path: '/UnitStatus/GetAllUnitStatuses', 
    params: '', 
    requiresAuth: true,
    category: 'Unit Status',
    description: 'Get statuses of all units'
  },

  // Unit Endpoints
  { 
    name: 'Get All Units', 
    method: 'GET', 
    path: '/Units/GetAllUnits', 
    params: '', 
    requiresAuth: true,
    category: 'Units',
    description: 'Get all units with their current status information'
  },
  { 
    name: 'Get All Unit Infos', 
    method: 'GET', 
    path: '/Units/GetAllUnitsInfos', 
    params: '', 
    requiresAuth: true,
    category: 'Units',
    description: 'Get detailed information about all units'
  },

  // Reference Data Endpoints
  { 
    name: 'Get All Unit Status Definitions', 
    method: 'GET', 
    path: '/Statuses/GetAllUnitStatuses', 
    params: '', 
    requiresAuth: true,
    category: 'Status Definitions',
    description: 'Get definitions for all unit status values'
  },
  { 
    name: 'Get All Call Types', 
    method: 'GET', 
    path: '/CallTypes/GetAllCallTypes', 
    params: '', 
    requiresAuth: true,
    category: 'Reference Data',
    description: 'Get all call types'
  },
  { 
    name: 'Get All Call Priorities', 
    method: 'GET', 
    path: '/CallPriorities/GetAllCallPriorites', 
    params: '', 
    requiresAuth: true,
    category: 'Reference Data',
    description: 'Get all call priorities'
  },
  { 
    name: 'Get All Call Protocols', 
    method: 'GET', 
    path: '/CallProtocols/GetAllCallProtocols', 
    params: '', 
    requiresAuth: true,
    category: 'Reference Data',
    description: 'Get all call protocols'
  },

  // Personnel Endpoints
  { 
    name: 'Get All Personnel Infos', 
    method: 'GET', 
    path: '/Personnel/GetAllPersonnelInfos', 
    params: '', 
    requiresAuth: true,
    category: 'Personnel',
    description: 'Get information about all personnel'
  },
  { 
    name: 'Get Personnel Info', 
    method: 'GET', 
    path: '/Personnel/GetPersonnelInfo', 
    params: `userId=${SAMPLE_USER_ID}`, 
    requiresAuth: true,
    category: 'Personnel',
    description: 'Get information about a specific personnel member'
  },
  { 
    name: 'Get Current Personnel Status', 
    method: 'GET', 
    path: '/PersonnelStatuses/GetCurrentStatus', 
    params: `userId=${SAMPLE_USER_ID}`, 
    requiresAuth: true,
    category: 'Personnel',
    description: 'Get current status of a specific personnel member'
  },

  // Department Endpoints
  { 
    name: 'Get All Department Groups', 
    method: 'GET', 
    path: '/Groups/GetAllGroups', 
    params: '', 
    requiresAuth: true,
    category: 'Department',
    description: 'Get all department groups'
  },
  { 
    name: 'Get Autofills', 
    method: 'GET', 
    path: '/Autofills/GetAllAutofills', 
    params: '', 
    requiresAuth: true,
    category: 'Department',
    description: 'Get all autofill templates for call creation'
  }
];

// Function to get API token
async function getApiToken() {
  try {
    console.log('🔑 Getting Resgrid API token...');
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
      console.log('✅ Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`❌ Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`  Status code: ${error.response.status}`);
      console.error(`  Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to test a single endpoint
async function testEndpoint(endpoint, token) {
  try {
    console.log(`\n📡 Testing: ${endpoint.name}`);
    console.log(`Category: ${endpoint.category}`);
    console.log(`Description: ${endpoint.description}`);
    
    if (endpoint.method === 'GET') {
      console.log(`URL: ${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`);
    } else {
      console.log(`URL: ${BASE_URL}${endpoint.path}`);
      if (endpoint.body) {
        console.log(`Body: ${endpoint.body.substring(0, 60)}...`);
      }
    }
    
    const config = {
      headers: {},
      timeout: 10000 // 10 second timeout for each request
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
      config.headers['Content-Type'] = endpoint.contentType || 'application/json';
      response = await axios.post(`${BASE_URL}${endpoint.path}`, endpoint.body, config);
    }
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    // Handle auth token response differently
    if (endpoint.path === '/Connect/token') {
      console.log(`  Response contains token properties: ${Object.keys(response.data).join(', ')}`);
      return {
        endpoint: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        category: endpoint.category,
        status: 'success',
        statusCode: response.status,
        notes: 'Returns JWT token with expiration'
      };
    }
    
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
          
          return {
            endpoint: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            category: endpoint.category,
            status: 'success',
            statusCode: response.status,
            dataType: 'array',
            itemCount: response.data.Data.length,
            sampleFields: response.data.Data.length > 0 ? Object.keys(response.data.Data[0]) : []
          };
        } else if (typeof response.data.Data === 'object' && response.data.Data !== null) {
          console.log(`  Response contains an object with ${Object.keys(response.data.Data).length} properties`);
          console.log(`  Properties: ${Object.keys(response.data.Data).join(', ')}`);
          
          return {
            endpoint: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            category: endpoint.category, 
            status: 'success',
            statusCode: response.status,
            dataType: 'object',
            properties: Object.keys(response.data.Data)
          };
        } else if (response.data.Data === null) {
          console.log(`  Response Data is null`);
          
          return {
            endpoint: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            category: endpoint.category,
            status: 'success',
            statusCode: response.status,
            dataType: 'null'
          };
        }
      } else {
        // For other response patterns
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
        return {
          endpoint: endpoint.name,
          path: endpoint.path,
          method: endpoint.method,
          category: endpoint.category,
          status: 'success',
          statusCode: response.status,
          dataType: 'custom',
          responseType: typeof response.data
        };
      }
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      category: endpoint.category,
      status: 'success',
      statusCode: response.status,
      dataType: 'unknown'
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
      method: endpoint.method,
      category: endpoint.category,
      status: 'error',
      statusCode: error.response ? error.response.status : 0,
      errorMessage: error.message,
      errorDetails: errorDetails,
      errorType: error.response ? 
                (error.response.status === 401 ? 'authorization' : 
                 error.response.status === 400 ? 'bad_request' : 
                 error.response.status === 404 ? 'not_found' : 'other') : 'network'
    };
  }
}

// Generate a comprehensive API documentation from test results
function generateApiDocumentation(results) {
  let md = `# Resgrid API Documentation\n\n`;
  md += `*Generated: ${new Date().toLocaleString()}*\n\n`;
  md += `This documentation is based on actual API testing and provides verified endpoints for Resgrid integration.\n\n`;
  
  md += `## Base URL\n\n`;
  md += `All API requests must use the full base URL:\n\n`;
  md += `\`\`\`\nhttps://api.resgrid.com/api/v4\n\`\`\`\n\n`;
  
  // Authentication section
  md += `## Authentication\n\n`;
  const authEndpoint = results.find(r => r.category === 'Authentication');
  if (authEndpoint) {
    md += `### ${authEndpoint.endpoint}\n\n`;
    md += `\`${authEndpoint.method} ${BASE_URL}${authEndpoint.path}\`\n\n`;
    md += `Request body format (must be application/x-www-form-urlencoded):\n`;
    md += `\`\`\`\ngrant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD\n\`\`\`\n\n`;
    md += `Returns a JWT token that must be included in the Authorization header for all other requests.\n\n`;
  }
  
  // Group results by category
  const categories = [...new Set(results.map(r => r.category))].filter(c => c !== 'Authentication');
  
  for (const category of categories) {
    md += `## ${category} Endpoints\n\n`;
    
    const categoryEndpoints = results.filter(r => r.category === category && r.status === 'success');
    
    for (const endpoint of categoryEndpoints) {
      md += `### ${endpoint.endpoint}\n\n`;
      
      if (endpoint.method === 'GET') {
        const urlWithParams = endpoint.path + (endpoint.params ? '?' + endpoint.params : '');
        md += `\`${endpoint.method} ${BASE_URL}${urlWithParams}\`\n\n`;
      } else {
        md += `\`${endpoint.method} ${BASE_URL}${endpoint.path}\`\n\n`;
      }
      
      // Add description
      const originalEndpoint = endpoints.find(e => e.name === endpoint.endpoint);
      if (originalEndpoint && originalEndpoint.description) {
        md += `${originalEndpoint.description}.\n\n`;
      }
      
      // Add response data type information
      if (endpoint.dataType === 'array') {
        md += `Returns an array of items`;
        if (endpoint.itemCount > 0) {
          md += ` with the following fields: ${endpoint.sampleFields.join(', ')}`;
        }
        md += `.\n\n`;
      } else if (endpoint.dataType === 'object') {
        md += `Returns an object with the following properties: ${endpoint.properties.join(', ')}.\n\n`;
      } else if (endpoint.dataType === 'null') {
        md += `Returns null data.\n\n`;
      }
    }
  }
  
  // Add status code reference
  md += `## Status Code Reference\n\n`;
  md += `| StatusId | Text | Description | Usage in Integration |\n`;
  md += `|----------|------|-------------|--------|\n`;
  md += `| 0 | Available | Unit is available for dispatch | Back in Service (fallback) |\n`;
  md += `| 2 | Available | Alternative for available status | Back in Service (fallback) |\n`;
  md += `| 3 | Committed | Unit is at patient | At Patient time |\n`;
  md += `| 5 | Responding / En Route | Unit is en route to the call | En Route time |\n`;
  md += `| 6 | On Scene | Unit has arrived at the scene | Arrived on Scene time |\n`;
  md += `| 8 | Returning | Unit is returning to station | Back in Service time |\n\n`;
  
  // Add failed endpoints
  const failedEndpoints = results.filter(r => r.status === 'error');
  if (failedEndpoints.length > 0) {
    md += `## Non-Working Endpoints\n\n`;
    md += `The following endpoints were tested but returned errors:\n\n`;
    
    for (const endpoint of failedEndpoints) {
      md += `- \`${endpoint.method} ${endpoint.path}\` - Status ${endpoint.statusCode} (${endpoint.errorType})\n`;
    }
    md += `\n`;
  }
  
  // Add best practices
  md += `## Best Practices\n\n`;
  md += `1. **Use Full URLs**: Always include the complete base URL in all requests\n`;
  md += `2. **Check Data Property**: Always access the .Data property to get the actual response data\n`;
  md += `3. **Use Unit IDs**: When fetching unit status, always use the numeric unit ID rather than the name\n`;
  md += `4. **Token Management**: Implement token caching with at least 15 minutes refresh margin\n`;
  md += `5. **Activity Data**: Check both the Activity and Dispatches arrays in call data for complete unit information\n`;
  md += `6. **Error Handling**: Implement retry mechanisms with exponential backoff for network failures\n\n`;
  
  return md;
}

// Main function to test all endpoints
async function testAllEndpoints() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token, aborting endpoint tests');
    return;
  }
  
  const results = [];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, token);
    results.push(result);
  }
  
  // Summarize results
  const successfulEndpoints = results.filter(r => r.status === 'success');
  const failedEndpoints = results.filter(r => r.status === 'error');
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Successful: ${successfulEndpoints.length}`);
  console.log(`Failed: ${failedEndpoints.length}`);
  
  // Group successful endpoints by category
  const categories = [...new Set(successfulEndpoints.map(r => r.category))];
  
  console.log('\n✅ SUCCESSFUL ENDPOINTS BY CATEGORY:');
  for (const category of categories) {
    console.log(`\n${category}:`);
    const categoryEndpoints = successfulEndpoints.filter(r => r.category === category);
    categoryEndpoints.forEach(endpoint => {
      console.log(`- ${endpoint.endpoint} (${endpoint.path})`);
    });
  }
  
  if (failedEndpoints.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    failedEndpoints.forEach(endpoint => {
      console.log(`- ${endpoint.endpoint} (${endpoint.path}): ${endpoint.statusCode} ${endpoint.errorType}`);
    });
  }
  
  // Generate comprehensive API documentation
  const apiDocs = generateApiDocumentation(results);
  const docsFilename = 'VERIFIED_API_REFERENCE.md';
  fs.writeFileSync(docsFilename, apiDocs);
  console.log(`\n📝 Comprehensive API documentation saved to ${docsFilename}`);
}

// Execute the tests
testAllEndpoints().catch(console.error);