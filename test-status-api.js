/**
 * Test script to verify the Statuses/GetAllUnitStatuses endpoint
 */
require('dotenv').config();
const axios = require('axios');

async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  try {
    console.log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
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
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
  }
  return null;
}

async function getUnitStatuses(token) {
  try {
    console.log('Fetching unit statuses from Resgrid API...');
    
    const url = 'https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses';
    console.log(`Using endpoint: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('\n🔔 API RESPONSE STATUS:', response.status);
    
    if (response.data) {
      // Pretty print the response data
      console.log('API Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Extract and display just the unit statuses
      if (response.data.Data && Array.isArray(response.data.Data)) {
        console.log('\n🔔 UNIT STATUSES:');
        
        for (const statusGroup of response.data.Data) {
          console.log(`\nUnit Type: ${statusGroup.UnitType}`);
          console.log(`Status ID: ${statusGroup.StatusId || 'null'}`);
          
          if (statusGroup.Statuses && Array.isArray(statusGroup.Statuses)) {
            console.log('Available Statuses:');
            
            const statuses = statusGroup.Statuses.map(status => ({
              Id: status.Id,
              Text: status.Text,
              BColor: status.BColor,
              Detail: status.Detail
            }));
            
            // Create a formatted table for the statuses
            console.table(statuses);
            
            // Export as markdown table format
            console.log('\nMarkdown Table Format:');
            console.log('| Id | Text | BColor | Detail |');
            console.log('|----|------|--------|--------|');
            
            for (const status of statuses) {
              console.log(`| ${status.Id} | ${status.Text} | ${status.BColor} | ${status.Detail} |`);
            }
          } else {
            console.log('No status data available for this unit type');
          }
        }
      }
    } else {
      console.log('No data returned from API');
    }
  } catch (error) {
    console.error(`Error fetching unit statuses: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  await getUnitStatuses(token);
  console.log('\nTest complete');
}

main().catch(console.error);