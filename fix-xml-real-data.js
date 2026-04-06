/**
 * Script to fix XML generation with real Resgrid data
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { create } = require('xmlbuilder2');
const { getApiToken } = require('./src/token-manager');

async function main() {
  try {
    console.log('Fetching real call data...');
    
    // Get a token for the Resgrid API
    const token = await getApiToken();
    
    // Get active calls
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !response.data.Data.length) {
      console.log('No active calls found.');
      return;
    }
    
    // Use the most recent call
    const call = response.data.Data[0];
    console.log(`Using call ID ${call.CallId}: ${call.Name}`);
    
    // Get extra data
    const extraDataResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      params: { callId: call.CallId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Extract required data
    const callId = call.CallId || '';
    const loggedOn = call.LoggedOn || '';
    const name = call.Name || '';
    const nature = call.Nature || '';
    const address = call.Address || '';
    const type = call.Type || '';
    const contactName = call.ContactName || '';
    const contactInfo = call.ContactInfo || '';
    const externalId = call.ExternalId || '';
    
    // Parse address components
    let city = '';
    let state = '';
    let zip = '';
    
    if (address) {
      const addressParts = address.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        city = addressParts[1] || '';
        if (addressParts[2]) {
          const stateZipParts = addressParts[2].split(' ').filter(p => p);
          state = stateZipParts[0] || '';
          zip = stateZipParts[1] || '';
        }
      }
    }
    
    // Split contact name
    let firstName = '';
    let lastName = '';
    if (contactName) {
      const nameParts = contactName.trim().split(' ');
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }
    }
    
    // Map priority
    let priorityId = call.Priority ? call.Priority.toString() : "1560";
    const responseMode = priorityId === "1559" ? "395" : "390";
    
    // Parse geolocation
    let latitude = '';
    let longitude = '';
    if (call.Geolocation) {
      const geoparts = call.Geolocation.split(',');
      if (geoparts.length === 2) {
        latitude = geoparts[0];
        longitude = geoparts[1];
      }
    }
    
    // Create XML with alternative pattern
    console.log("\nGenerating XML with alternative element creation pattern...");
    
    const docAlt = create({ version: '1.0', encoding: 'UTF-8' });
    const root = docAlt.ele('CadIncident', { 'xmlns_xsi': 'http://www.w3.org/2001/XMLSchema-instance' });
    
    // Fixed GUID
    root.ele('Guid').txt("b394de98-a5b7-408d-a1f2-020eddff92b9");
    root.ele('IncidentNumber').txt(callId);
    root.ele('IncidentOrOnset').txt(loggedOn);
    root.ele('DispatchNotified').txt(loggedOn);
    root.ele('ComplaintReportedByDispatch').txt(type);
    root.ele('IncidentAddress1').txt(address);
    root.ele('IncidentCity').txt(city);
    root.ele('IncidentState').txt(state);
    root.ele('IncidentZip').txt(zip);
    root.ele('CadDispatchText').txt(nature);
    root.ele('EmsUnitCallSign').txt('STN1');
    root.ele('UnitNotifiedByDispatch').txt('STN1');
    root.ele('ResponseModeToScene').txt(responseMode);
    root.ele('CallNature').txt(name);
    root.ele('CallNatureDescription').txt(nature);
    root.ele('UnitEnRoute').txt('');
    root.ele('UnitArrivedOnScene').txt('');
    root.ele('UnitAtPatient').txt('');
    root.ele('UnitCleared').txt('');
    root.ele('SceneGpsLocationLat').txt(latitude);
    root.ele('SceneGpsLocationLong').txt(longitude);
    root.ele('PatientFirstName').txt(firstName);
    root.ele('PatientLastName').txt(lastName);
    root.ele('PatientPhone').txt(contactInfo);
    root.ele('PatientDOB').txt(externalId);
    
    const xmlAlt = docAlt.end({ prettyPrint: true });
    
    // Save to file
    const fixedPath = path.join(__dirname, 'logs', `fixed_call_${callId}.xml`);
    fs.writeFileSync(fixedPath, xmlAlt);
    
    console.log(`Fixed XML saved to: ${fixedPath}`);
    console.log("First 200 characters of XML:");
    console.log(xmlAlt.substring(0, 200) + "...");
    
    // Verify the XML has no formatting issues
    if (xmlAlt.includes('</IncidentAddress1>>')) {
      console.error('❌ ERROR: XML still contains malformed IncidentAddress1 tag');
    } else {
      console.log('✅ SUCCESS: XML contains properly formatted IncidentAddress1 tag');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run the script
main();