/**
 * Debug Unit Timing Data for Call 201192
 * Examine the actual structure to understand why unit times aren't populating
 */
require('dotenv').config();
const axios = require('axios');

async function debugUnitTiming() {
  try {
    console.log('Debugging Unit Timing for Call 201192');
    console.log('=====================================\n');

    // Get token
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const tokenResponse = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
      Username: username,
      Password: password
    });

    const token = tokenResponse.data.Tk;

    console.log('1. Fetching call data...');
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const callData = callResponse.data.Data;

    console.log('2. Fetching extra data (contains Activities)...');
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const extraData = extraResponse.data.Data;

    console.log('\n3. Unit Analysis:');
    console.log('Units from Dispatches:');
    if (extraData.Dispatches) {
      extraData.Dispatches
        .filter(d => d.Type === 'Unit')
        .forEach(unit => {
          console.log(`  - ${unit.Name} (ID: ${unit.Id})`);
        });
    }

    console.log('\n4. Activity Analysis:');
    if (extraData.Activity && Array.isArray(extraData.Activity)) {
      console.log(`Found ${extraData.Activity.length} activities:`);
      
      extraData.Activity.forEach((activity, index) => {
        console.log(`\nActivity ${index + 1}:`);
        console.log(`  UnitName: "${activity.UnitName || 'NOT FOUND'}"`);
        console.log(`  Unit: "${activity.Unit || 'NOT FOUND'}"`);
        console.log(`  Name: "${activity.Name || 'NOT FOUND'}"`);
        console.log(`  StatusId: ${activity.StatusId}`);
        console.log(`  DestinationStatusId: ${activity.DestinationStatusId}`);
        console.log(`  DestinationStateText: "${activity.DestinationStateText || 'NOT FOUND'}"`);
        console.log(`  Timestamp: "${activity.Timestamp || 'NOT FOUND'}"`);
        console.log(`  Time: "${activity.Time || 'NOT FOUND'}"`);
        console.log(`  Type: "${activity.Type || 'NOT FOUND'}"`);
        
        // Show all fields for debugging
        console.log(`  All fields: ${Object.keys(activity).join(', ')}`);
      });
    } else {
      console.log('No activities found or activities is not an array');
    }

    console.log('\n5. Sample timing extraction:');
    
    // Get units
    const units = [];
    if (extraData.Dispatches) {
      extraData.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
        if (unit.Name && !units.includes(unit.Name)) {
          units.push(unit.Name);
        }
      });
    }
    
    console.log(`Units found: ${units.join(', ')}`);
    
    // Initialize timing arrays
    const unitTimings = {
      dispatched: new Array(units.length).fill(''),
      enRoute: new Array(units.length).fill(''),
      arrived: new Array(units.length).fill(''),
      atPatient: new Array(units.length).fill(''),
      cleared: new Array(units.length).fill(''),
      backInService: new Array(units.length).fill(''),
      transport: new Array(units.length).fill(''),
      atHospital: new Array(units.length).fill('')
    };
    
    // Extract timing data
    if (extraData.Activity && Array.isArray(extraData.Activity)) {
      extraData.Activity.forEach(activity => {
        const unitName = activity.UnitName || activity.Unit || activity.Name;
        if (unitName) {
          const unitIndex = units.indexOf(unitName);
          if (unitIndex !== -1) {
            const statusId = activity.StatusId || activity.DestinationStatusId;
            const timestamp = activity.Timestamp || activity.Time || '';
            
            console.log(`Processing ${unitName} (index ${unitIndex}): StatusId=${statusId}, Timestamp=${timestamp}`);
            
            switch (statusId) {
              case 1: unitTimings.dispatched[unitIndex] = timestamp; break;
              case 5: unitTimings.enRoute[unitIndex] = timestamp; break;
              case 6: unitTimings.arrived[unitIndex] = timestamp; break;
              case 3: unitTimings.atPatient[unitIndex] = timestamp; break;
              case 8: unitTimings.cleared[unitIndex] = timestamp; break;
              case 2: unitTimings.backInService[unitIndex] = timestamp; break;
              case 7: unitTimings.transport[unitIndex] = timestamp; break;
              case 9: unitTimings.atHospital[unitIndex] = timestamp; break;
            }
          }
        }
      });
    }
    
    console.log('\n6. Final timing results:');
    console.log('Units:', units.join(', '));
    console.log('Dispatched:', unitTimings.dispatched.join(', '));
    console.log('En Route:', unitTimings.enRoute.join(', '));
    console.log('Arrived:', unitTimings.arrived.join(', '));
    console.log('At Patient:', unitTimings.atPatient.join(', '));
    console.log('Cleared:', unitTimings.cleared.join(', '));
    console.log('Back In Service:', unitTimings.backInService.join(', '));
    console.log('Transport:', unitTimings.transport.join(', '));
    console.log('At Hospital:', unitTimings.atHospital.join(', '));

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

if (require.main === module) {
  debugUnitTiming();
}