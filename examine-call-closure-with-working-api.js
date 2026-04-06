/**
 * Examine Call Closure with Working API
 * 
 * Uses the same API client as the working system to examine call data
 * and find the actual field that represents call closure in Resgrid.
 */

require('dotenv').config();

// Use the same modules as the working system
const { apiClient } = require('./src/token-manager');

async function examineCallClosureWithWorkingAPI() {
  console.log('Examining Call Closure with Working API');
  console.log('======================================');
  
  try {
    // Test 1: Use the working GetActiveCalls endpoint
    console.log('1. Examining GetActiveCalls response structure...');
    try {
      const activeResponse = await apiClient.get('Calls/GetActiveCalls');
      const activeCalls = activeResponse.data.Data || [];
      
      console.log(`Found ${activeCalls.length} active calls`);
      
      if (activeCalls.length > 0) {
        const call = activeCalls[0];
        console.log(`\nActive call ${call.CallId} structure:`);
        console.log('All fields:');
        Object.keys(call).sort().forEach(key => {
          const value = call[key];
          console.log(`  ${key}: ${value}`);
        });
        
        console.log('\nPotential closure-related fields:');
        Object.keys(call).forEach(key => {
          const value = call[key];
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('close') || lowerKey.includes('end') || 
              lowerKey.includes('complete') || lowerKey.includes('finish') ||
              lowerKey.includes('state') || lowerKey.includes('status')) {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
    } catch (error) {
      console.log(`Error with GetActiveCalls: ${error.message}`);
    }
    
    // Test 2: Use GetCall for call 201192 (current active call)
    console.log('\n2. Examining GetCall for current call 201192...');
    try {
      const callResponse = await apiClient.get('Calls/GetCall', {
        params: { callId: '201192' }
      });
      
      const call = callResponse.data.Data;
      console.log('Call 201192 complete structure:');
      
      Object.keys(call).sort().forEach(key => {
        const value = call[key];
        console.log(`  ${key}: ${value}`);
      });
      
      console.log('\nState and closure-related fields for active call:');
      Object.keys(call).forEach(key => {
        const value = call[key];
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('close') || lowerKey.includes('end') || 
            lowerKey.includes('complete') || lowerKey.includes('finish') ||
            lowerKey.includes('state') || lowerKey.includes('status') ||
            value === 'Active' || value === 'Closed') {
          console.log(`  ${key}: ${value}`);
        }
      });
    } catch (error) {
      console.log(`Error with GetCall: ${error.message}`);
    }
    
    // Test 3: Use GetCallExtraData for call 201192
    console.log('\n3. Examining GetCallExtraData for call 201192...');
    try {
      const extraResponse = await apiClient.get('Calls/GetCallExtraData', {
        params: { callId: '201192' }
      });
      
      const extraData = extraResponse.data.Data;
      console.log('Extra data structure:');
      
      Object.keys(extraData).forEach(key => {
        const value = extraData[key];
        if (Array.isArray(value)) {
          console.log(`  ${key}: [Array with ${value.length} items]`);
          if (value.length > 0 && typeof value[0] === 'object') {
            console.log(`    Sample item keys: ${Object.keys(value[0]).join(', ')}`);
          }
        } else if (typeof value === 'object' && value !== null) {
          console.log(`  ${key}: [Object with keys: ${Object.keys(value).join(', ')}]`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      // Check Activities for closure-related fields
      if (extraData.Activity && Array.isArray(extraData.Activity)) {
        console.log('\nActivity entries (looking for closure indicators):');
        extraData.Activity.forEach((activity, index) => {
          console.log(`  Activity ${index + 1}:`);
          Object.keys(activity).forEach(key => {
            const value = activity[key];
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('close') || lowerKey.includes('end') || 
                lowerKey.includes('complete') || lowerKey.includes('state') ||
                lowerKey.includes('status') || key === 'StatusId' || key === 'Type') {
              console.log(`    ${key}: ${value}`);
            }
          });
        });
      }
    } catch (error) {
      console.log(`Error with GetCallExtraData: ${error.message}`);
    }
    
    // Test 4: Try different call endpoint variations
    console.log('\n4. Testing alternative call endpoints...');
    const endpoints = [
      'Calls/GetCallHistory?callId=201192',
      'Calls/GetClosedCalls',
      'Calls/GetCompletedCalls'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\nTrying ${endpoint}...`);
        const response = await apiClient.get(endpoint);
        console.log(`  Success! Response structure:`);
        
        if (response.data.Data) {
          if (Array.isArray(response.data.Data)) {
            console.log(`  Found ${response.data.Data.length} items`);
            if (response.data.Data.length > 0) {
              const item = response.data.Data[0];
              console.log(`  Sample item keys: ${Object.keys(item).join(', ')}`);
              
              // Look for closure fields in the first item
              Object.keys(item).forEach(key => {
                const value = item[key];
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('close') || lowerKey.includes('end') || 
                    lowerKey.includes('complete') || lowerKey.includes('state')) {
                  console.log(`    ${key}: ${value}`);
                }
              });
            }
          } else {
            console.log(`  Response keys: ${Object.keys(response.data.Data).join(', ')}`);
          }
        } else {
          console.log(`  Response keys: ${Object.keys(response.data).join(', ')}`);
        }
      } catch (error) {
        console.log(`  Failed: ${error.response?.status || error.message}`);
      }
    }
    
    console.log('\n======================================');
    console.log('Analysis Summary:');
    console.log('======================================');
    console.log('Looking for fields that indicate when a call is officially closed');
    console.log('in Resgrid dispatch system (not just when units clear the scene).');
    console.log('This should be the timestamp when dispatcher marks call as closed.');
    
  } catch (error) {
    console.error('Error examining call closure:', error.message);
  }
}

// Run the examination
examineCallClosureWithWorkingAPI();