/**
 * Analyze Address Parsing Issue for Call 200892
 * Check current address data and implement enhanced parsing logic
 */

require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
    grant_type: 'password',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  return response.data.access_token;
}

async function fetchCallData(token, callId) {
  const [callResponse, extraResponse] = await Promise.all([
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  return { call: callResponse.data, extra: extraResponse.data };
}

function analyzeAddressParsing(address) {
  console.log(`\nAnalyzing address: "${address}"`);
  
  // Current basic parsing
  const basicParts = address.split(',').map(p => p.trim());
  console.log('Basic comma-split parts:', basicParts);
  
  // Enhanced parsing logic
  function enhancedAddressParsing(fullAddress) {
    if (!fullAddress) return { address1: '', address2: '', city: '', state: '', zip: '' };
    
    // Clean the address
    const cleaned = fullAddress.trim();
    
    // Split by comma and analyze each part
    const parts = cleaned.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    let address1 = '';
    let address2 = '';
    let city = '';
    let state = '';
    let zip = '';
    
    if (parts.length >= 1) {
      // First part is usually the primary address
      const firstPart = parts[0];
      
      // Check if first part contains building/suite info
      const buildingKeywords = ['building', 'bldg', 'suite', 'ste', 'apt', 'apartment', 'unit', 'floor', 'fl'];
      const hasBuildingInfo = buildingKeywords.some(keyword => 
        firstPart.toLowerCase().includes(keyword)
      );
      
      if (hasBuildingInfo) {
        // Split the first part to separate street from building info
        const buildingMatch = firstPart.match(/(.+?)\s+(building|bldg|suite|ste|apt|apartment|unit|floor|fl)\s*(.+)/i);
        if (buildingMatch) {
          address1 = buildingMatch[1].trim();
          address2 = `${buildingMatch[2]} ${buildingMatch[3]}`.trim();
        } else {
          address1 = firstPart;
        }
      } else {
        address1 = firstPart;
      }
    }
    
    if (parts.length >= 2) {
      const secondPart = parts[1];
      
      // Check if second part looks like building info
      const buildingKeywords = ['building', 'bldg', 'suite', 'ste', 'apt', 'apartment', 'unit', 'floor', 'fl'];
      const isBuildingInfo = buildingKeywords.some(keyword => 
        secondPart.toLowerCase().includes(keyword)
      );
      
      if (isBuildingInfo && !address2) {
        address2 = secondPart;
        // City would be in the next part
        if (parts.length >= 3) {
          city = parts[2];
        }
      } else {
        // Assume it's the city
        city = secondPart;
      }
    }
    
    if (parts.length >= 3 && !city) {
      city = parts[2];
    }
    
    // Look for state and zip in the last parts
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      
      // Check for state/zip pattern like "CA 90210" or "California 90210"
      const stateZipMatch = part.match(/^([A-Z]{2}|[A-Za-z\s]+)\s+(\d{5}(-\d{4})?)$/);
      if (stateZipMatch) {
        state = stateZipMatch[1].trim();
        zip = stateZipMatch[2];
        break;
      }
      
      // Check for just zip code
      const zipMatch = part.match(/^\d{5}(-\d{4})?$/);
      if (zipMatch) {
        zip = part;
        // Previous part might be state
        if (i > 0) {
          const prevPart = parts[i - 1];
          if (prevPart.match(/^[A-Z]{2}$|^[A-Za-z\s]+$/)) {
            state = prevPart;
          }
        }
        break;
      }
    }
    
    return { address1, address2, city, state, zip };
  }
  
  const enhanced = enhancedAddressParsing(address);
  console.log('Enhanced parsing result:', enhanced);
  
  return enhanced;
}

async function main() {
  console.log('Analyzing Address Parsing Issue for Call 200892');
  console.log('=============================================');
  
  try {
    const token = await getResgridToken();
    const callData = await fetchCallData(token, '200892');
    
    const call = callData.call.Data || callData.call;
    
    console.log('\nCall 200892 Details:');
    console.log(`Call ID: ${call.CallId}`);
    console.log(`Call Name: ${call.Name}`);
    console.log(`Full Address: "${call.Address}"`);
    
    // Analyze the address parsing
    const addressAnalysis = analyzeAddressParsing(call.Address);
    
    console.log('\n=== ADDRESS PARSING ANALYSIS ===');
    console.log('Current Issue: City shows "Santa Monica Blvd building ste 223"');
    console.log('Expected Results:');
    console.log('- Address Line 1: Street address (Santa Monica Blvd portion)');
    console.log('- Address Line 2: Building/Suite info (building ste 223)');
    console.log('- City: West Hollywood');
    console.log('- State: CA');
    console.log('- ZIP: Extracted if present');
    
    console.log('\nRecommended Implementation:');
    console.log('1. Enhanced address parsing with building/suite detection');
    console.log('2. Add Address Line 2 field to Google Sheets');
    console.log('3. Update XML generation to include IncidentAddress2');
    console.log('4. Implement keyword-based parsing for building indicators');
    
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

main();