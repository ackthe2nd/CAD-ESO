/**
 * XML Generator for Resgrid to ESO Bridge
 * Properly maps fields from Resgrid to ESO format based on requirements
 * Fixed to properly handle XML formatting
 */
const { create } = require('xmlbuilder2');

/**
 * Generates XML for ESO from call data
 * @param {Object} callGetData - Data from the GetCall endpoint
 * @param {Object} extraGetData - Data from the GetCallExtraData endpoint
 * @param {boolean} [debug=false] - Whether to enable debug logging
 * @returns {string} XML string
 */
function generateXML(callData, extraData = {}, debug = false) {
  // Extract data from the nested structure if needed
  let callGetData;
  let extraGetData;
  
  // Handle different ways the data might be structured
  if (callData.Data) {
    // Single object with Data property
    callGetData = callData.Data;
    extraGetData = extraData.Data || callData.Data || {};
  } else if (callData.GetCall && callData.GetCall.Data) {
    // Combined object with separate endpoints
    callGetData = callData.GetCall.Data;
    extraGetData = callData.GetCallExtraData?.Data || {};
  } else {
    // Assume the raw data is directly passed
    callGetData = callData;
    extraGetData = extraData || {};
  }
  
  if (debug) {
    console.log("Debug - Call data structure:", Object.keys(callGetData));
    console.log("Debug - Extra data structure:", Object.keys(extraGetData));
  }
  
  // Use a fixed GUID for all calls as specified
  const guid = "b394de98-a5b7-408d-a1f2-020eddff92b9";
  
  // Extract the specific fields we need from the GetCall response
  const callId = callGetData.CallId || '';
  const loggedOn = callGetData.LoggedOn || callGetData.LoggedOnUtc || '';
  const name = callGetData.Name || '';
  const nature = callGetData.Nature || '';
  const note = callGetData.Note || '';
  // Clean the address by removing any carriage returns or other problematic characters
  const address = (callGetData.Address || '').replace(/[\r\n]/g, '');
  const type = callGetData.Type || '';
  
  // Patient information
  const contactName = callGetData.ContactName || '';
  const contactInfo = callGetData.ContactInfo || '';
  const externalId = callGetData.ExternalId || '';
  
  // Split contact name into first and last name
  let patientFirstName = '';
  let patientLastName = '';
  
  if (contactName) {
    const nameParts = contactName.trim().split(' ');
    if (nameParts.length >= 2) {
      patientFirstName = nameParts[0];
      patientLastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      patientFirstName = nameParts[0];
    }
  }
  
  // Parse address components (city, state, zip)
  let streetAddress = '';
  let city = '';
  let state = '';
  let zip = '';
  
  if (address) {
    // Sample address: "14051 Califa St, Sherman Oaks, CA 91401, USA"
    const addressParts = address.split(',').map(part => part.trim());
    
    // Street address should only be the first part (e.g., "14051 Califa St")
    streetAddress = addressParts[0] || '';
    
    // Try to extract components
    if (addressParts.length >= 3) {
      // City is usually the second part
      city = addressParts[1] || '';
      
      // State and ZIP are usually in the third part as "CA 91401"
      if (addressParts[2]) {
        const stateZipParts = addressParts[2].split(' ').filter(p => p);
        state = stateZipParts[0] || '';
        zip = stateZipParts[1] || '';
      }
    }
  }
  
  // Handle priority correctly
  let priorityId = "1560"; // Default to emergent if missing
  if (callGetData.Priority) {
    if (typeof callGetData.Priority === 'object' && callGetData.Priority.Id) {
      priorityId = callGetData.Priority.Id.toString();
    } else {
      priorityId = callGetData.Priority.toString();
    }
  }
  
  // First check if nature contains non-emergency keywords
  let responseMode = "390"; // Default to lights & sirens
  if (nature && typeof nature === 'string') {
    // Check if nature includes "Non-Emergency" or other keywords
    if (/non.?emergency|non.?urgent|routine|scheduled/i.test(nature)) {
      responseMode = "395"; // Non-emergency (395)
    }
  }
  
  // If no keyword match, then map priority ID to response mode
  if (responseMode === "390") { // Only override if still default value
    // Map priority ID to response mode
    // 1559 = Non-emergent (no lights & sirens) = 395
    // 1560 = Emergent (lights & sirens) = 390
    const responseModeMap = {
      "1559": "395", // Non-emergent -> no lights & sirens
      "1560": "390"  // Emergent -> lights & sirens
    };
    responseMode = responseModeMap[priorityId] || "390"; // Default to lights & sirens
  }
  
  // Parse geolocation
  let latitude = '';
  let longitude = '';
  if (callGetData.Geolocation) {
    const geoparts = callGetData.Geolocation.split(',');
    if (geoparts.length === 2) {
      latitude = geoparts[0];
      longitude = geoparts[1];
    }
  }
  
  // Extract unit information and timestamps from GetCallExtraData
  let unitName = '';
  let unitLocation = '';
  let unitEnRouteTime = '';
  let unitArrivedOnSceneTime = '';
  let unitAtPatientTime = '';
  let unitClearedTime = '';
  let unitBackInServiceTime = '';
  
  // First check if there's a UnitsCsv field available (some API responses include this)
  if (callGetData.UnitsCsv) {
    // If UnitsCsv contains comma-separated values, take the first one that meets our criteria
    const unitsList = callGetData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    
    if (debug) {
      console.log("Looking for valid units in UnitsCsv:", callGetData.UnitsCsv);
      unitsList.forEach(u => {
        console.log(`  Unit: ${u}, Length: ${u.length}, Alphanumeric: ${/^[a-zA-Z0-9]+$/.test(u)}, Valid: ${u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u)}`);
      });
    }
    if (validUnit) {
      unitName = validUnit;
    }
  }
  
  // If no unit found from UnitsCsv, try the Dispatches array
  if (!unitName && extraGetData.Dispatches && Array.isArray(extraGetData.Dispatches)) {
    // Filter for units with Type='Unit' and Name matching alphanumeric pattern with 9 or fewer characters
    const validUnits = extraGetData.Dispatches.filter(d => 
      d.Type === 'Unit' && 
      d.Name && 
      d.Name.length <= 9 && 
      /^[a-zA-Z0-9]+$/.test(d.Name)
    );
    
    if (debug) {
      console.log("Looking for valid units in dispatches array:");
      extraGetData.Dispatches.forEach(d => {
        console.log(`  Unit: ${d.Name}, Type: ${d.Type}, Length: ${d.Name?.length}, Alphanumeric: ${/^[a-zA-Z0-9]+$/.test(d.Name || '')}, Valid: ${d.Type === 'Unit' && d.Name && d.Name.length <= 9 && /^[a-zA-Z0-9]+$/.test(d.Name)}`);
      });
    }
    
    // Use the first valid unit if available
    if (validUnits.length > 0) {
      unitName = validUnits[0].Name;
      // Get unit location if available
      unitLocation = validUnits[0].Location || '';
      
      // Extract timestamps if available
      if (validUnits[0].EnRouteTime) unitEnRouteTime = validUnits[0].EnRouteTime;
      if (validUnits[0].ArrivedTime) unitArrivedOnSceneTime = validUnits[0].ArrivedTime;
      if (validUnits[0].AtPatientTime) unitAtPatientTime = validUnits[0].AtPatientTime;
      if (validUnits[0].ClearedTime) unitClearedTime = validUnits[0].ClearedTime;
    }
  }
  
  // Extract unit times from Activity array - this is where unit status changes are recorded
  if (extraGetData.Activity && Array.isArray(extraGetData.Activity)) {
    const validUnitActivities = extraGetData.Activity.filter(a => 
      a.Type === 'Unit' && a.Name === unitName && a.Timestamp && a.StatusId
    );
    
    if (debug && validUnitActivities.length > 0) {
      console.log(`Found ${validUnitActivities.length} activities for unit ${unitName}`);
    }
    
    // According to Resgrid API, StatusId 5 = En Route, StatusId 6 = On Scene
    const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
    const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
    
    // For back in service time, look for StatusId 2 (usually "Available") 
    // or check for status text containing "returning", "available", etc.
    // Note: "returning" is given higher priority in the search order
    const backInServiceKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
    
    // Try finding a status with appropriate keywords first
    const backInServiceByKeyword = validUnitActivities.find(a => 
      a.StatusText && backInServiceKeywords.some(keyword => 
        a.StatusText.toLowerCase().includes(keyword)
      )
    );
    
    // Otherwise try StatusId 2 which is often "Available"
    const availableActivity = validUnitActivities.find(a => a.StatusId === 2);
    
    // Extract timestamps if available
    if (enRouteActivity && enRouteActivity.Timestamp) {
      unitEnRouteTime = enRouteActivity.Timestamp;
      if (debug) console.log(`Found en route time: ${unitEnRouteTime}`);
    }
    
    if (onSceneActivity && onSceneActivity.Timestamp) {
      unitArrivedOnSceneTime = onSceneActivity.Timestamp;
      if (debug) console.log(`Found on scene time: ${unitArrivedOnSceneTime}`);
    }
    
    if (backInServiceByKeyword && backInServiceByKeyword.Timestamp) {
      unitBackInServiceTime = backInServiceByKeyword.Timestamp;
      if (debug) console.log(`Found back in service time (by keyword): ${unitBackInServiceTime}`);
    } else if (availableActivity && availableActivity.Timestamp) {
      unitBackInServiceTime = availableActivity.Timestamp;
      if (debug) console.log(`Found back in service time (StatusId 2): ${unitBackInServiceTime}`);
    }
  }
  
  // Also check for timestamps in the main call data
  if (!unitEnRouteTime && callGetData.EnRouteTime) unitEnRouteTime = callGetData.EnRouteTime;
  if (!unitArrivedOnSceneTime && callGetData.ArrivedTime) unitArrivedOnSceneTime = callGetData.ArrivedTime;
  if (!unitAtPatientTime && callGetData.AtPatientTime) unitAtPatientTime = callGetData.AtPatientTime;
  if (!unitClearedTime && callGetData.ClearedTime) unitClearedTime = callGetData.ClearedTime;
  
  // Also try alternative field names
  if (!unitEnRouteTime && callGetData.UnitEnRouteTime) unitEnRouteTime = callGetData.UnitEnRouteTime;
  if (!unitArrivedOnSceneTime && callGetData.UnitArrivedTime) unitArrivedOnSceneTime = callGetData.UnitArrivedTime;
  if (!unitAtPatientTime && callGetData.UnitAtPatientTime) unitAtPatientTime = callGetData.UnitAtPatientTime;
  if (!unitClearedTime && callGetData.UnitClearedTime) unitClearedTime = callGetData.UnitClearedTime;
  if (!unitBackInServiceTime && callGetData.UnitBackInServiceTime) unitBackInServiceTime = callGetData.UnitBackInServiceTime;
  if (!unitBackInServiceTime && callGetData.BackInServiceTime) unitBackInServiceTime = callGetData.BackInServiceTime;
  
  // If UnitCleared time is available but no BackInService time, use that
  if (!unitBackInServiceTime && unitClearedTime) unitBackInServiceTime = unitClearedTime;
  
  // Prepare call nature description with space-hyphen-space format
  const callNatureDescription = nature + (note ? ' - ' + note : '');
  
  // Format patient DOB if it's a valid date
  let formattedDOB = '';
  if (externalId) {
    // Try to parse externalId as a date
    const dobDate = new Date(externalId);
    if (!isNaN(dobDate.getTime())) {
      // If valid date, format as YYYY-MM-DD
      formattedDOB = dobDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }
  }

  // FIX: Use directly generated XML instead of builder to ensure no formatting issues
  // Removed: GUID, ComplaintReportedByDispatch, VehicleDispatchLocation, PatientPhone
  // Fixed: IncidentAddress1 to only include street address, UnitNotifiedByDispatch as DateTime, PatientDOB format
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${loggedOn}</IncidentOrOnset>
  <DispatchNotified>${loggedOn}</DispatchNotified>
  <IncidentAddress1>${streetAddress}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CadDispatchText>${nature}</CadDispatchText>
  <EmsUnitCallSign>${unitName}</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${loggedOn}</UnitNotifiedByDispatch>
  <ResponseModeToScene>${responseMode}</ResponseModeToScene>
  <CallNature>${name}</CallNature>
  <CallNatureDescription>${callNatureDescription}</CallNatureDescription>
  <UnitEnRoute>${unitEnRouteTime}</UnitEnRoute>
  <UnitArrivedOnScene>${unitArrivedOnSceneTime}</UnitArrivedOnScene>
  <UnitAtPatient>${unitAtPatientTime}</UnitAtPatient>
  <UnitCleared>${unitClearedTime}</UnitCleared>
  <UnitBackInService>${unitBackInServiceTime}</UnitBackInService>
  <SceneGpsLocationLat>${latitude}</SceneGpsLocationLat>
  <SceneGpsLocationLong>${longitude}</SceneGpsLocationLong>
  <PatientFirstName>${patientFirstName}</PatientFirstName>
  <PatientLastName>${patientLastName}</PatientLastName>
  <PatientDOB>${formattedDOB}</PatientDOB>
</CadIncident>`;
  
  return xml;
}

module.exports = { generateXML };