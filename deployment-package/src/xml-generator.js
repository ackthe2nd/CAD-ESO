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
  
  // Helper function to strip HTML tags from text
  function stripHtmlTags(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '').trim();
  }
  
  // Extract the specific fields we need from the GetCall response and strip HTML tags
  const callId = callGetData.CallId || '';
  const loggedOn = callGetData.LoggedOn || callGetData.LoggedOnUtc || '';
  const name = stripHtmlTags(callGetData.Name || '');
  const nature = stripHtmlTags(callGetData.Nature || '');
  const note = stripHtmlTags(callGetData.Note || '');
  // Clean the address by removing any carriage returns, HTML tags, or other problematic characters
  const address = stripHtmlTags((callGetData.Address || '').replace(/[\r\n]/g, ''));
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
  let unitNames = []; // Array to hold unit names (like "STN1")
  let unitLocation = '';
  let unitEnRouteTime = '';
  let unitArrivedOnSceneTime = '';
  let unitAtPatientTime = '';
  let unitClearedTime = '';
  let unitBackInServiceTime = '';
  
  // First check if there's a UnitsCsv field available (some API responses include this)
  if (callGetData.UnitsCsv) {
    if (debug) {
      console.log("Found UnitsCsv field:", callGetData.UnitsCsv);
    }
    // This field contains IDs, we'll need to match them to names later
  }
  
  // Check the Dispatches array for unit data - this is the primary source
  // The Dispatches array is in the Data property of extraGetData
  if (extraGetData.Data && extraGetData.Data.Dispatches && Array.isArray(extraGetData.Data.Dispatches)) {
    // Filter for entries with Type='Unit'
    const unitDispatches = extraGetData.Data.Dispatches.filter(d => d.Type === 'Unit');
    
    if (debug) {
      console.log(`Found ${unitDispatches.length} unit dispatches in Data.Dispatches`);
    }
    
    // Extract unit names and add to our list
    unitDispatches.forEach(unit => {
      if (unit.Name && !unitNames.includes(unit.Name)) {
        unitNames.push(unit.Name);
        if (debug) {
          console.log(`Added unit name: ${unit.Name} from dispatches`);
        }
      }
    });
    
    // Use the first unit for timestamps (if available)
    if (unitDispatches.length > 0) {
      // Get unit location if available
      unitLocation = unitDispatches[0].Location || '';
      
      // Extract timestamps if available
      if (unitDispatches[0].EnRouteTime) unitEnRouteTime = unitDispatches[0].EnRouteTime;
      if (unitDispatches[0].ArrivedTime) unitArrivedOnSceneTime = unitDispatches[0].ArrivedTime;
      if (unitDispatches[0].AtPatientTime) unitAtPatientTime = unitDispatches[0].AtPatientTime;
      if (unitDispatches[0].ClearedTime) unitClearedTime = unitDispatches[0].ClearedTime;
    }
  } 
  // Original check for backward compatibility
  else if (extraGetData.Dispatches && Array.isArray(extraGetData.Dispatches)) {
    // Filter for entries with Type='Unit'
    const unitDispatches = extraGetData.Dispatches.filter(d => d.Type === 'Unit');
    
    if (debug) {
      console.log(`Found ${unitDispatches.length} unit dispatches in direct Dispatches array`);
    }
    
    // Extract unit names and add to our list
    unitDispatches.forEach(unit => {
      if (unit.Name && !unitNames.includes(unit.Name)) {
        unitNames.push(unit.Name);
        if (debug) {
          console.log(`Added unit name: ${unit.Name} from direct dispatches`);
        }
      }
    });
    
    // Use timestamps from first unit if available
    if (unitDispatches.length > 0) {
      if (unitDispatches[0].EnRouteTime) unitEnRouteTime = unitDispatches[0].EnRouteTime;
      if (unitDispatches[0].ArrivedTime) unitArrivedOnSceneTime = unitDispatches[0].ArrivedTime;
      if (unitDispatches[0].AtPatientTime) unitAtPatientTime = unitDispatches[0].AtPatientTime;
      if (unitDispatches[0].ClearedTime) unitClearedTime = unitDispatches[0].ClearedTime;
    }
  }
  
  // If no unit names were found, the EmsUnitCallSign will be empty
  
  // Extract unit times from Activity array - this is where unit status changes are recorded
  if (extraGetData.Data && extraGetData.Data.Activity && Array.isArray(extraGetData.Data.Activity) && unitNames.length > 0) {
    // Get activities for the first unit if we have multiple
    const firstUnitName = unitNames[0];
    const validUnitActivities = extraGetData.Data.Activity.filter(a => 
      a.Type === 'Unit' && 
      ((a.Name === firstUnitName) || (a.UnitName === firstUnitName)) && 
      a.Timestamp && a.StatusId
    );
    
    if (debug) {
      console.log(`Found ${validUnitActivities.length} activities for unit ${firstUnitName} in Data.Activity`);
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
  // Try directly accessing Activity from extraGetData (fallback for backward compatibility)
  else if (extraGetData.Activity && Array.isArray(extraGetData.Activity) && unitNames.length > 0) {
    // Get activities for the first unit if we have multiple
    const firstUnitName = unitNames[0];
    const validUnitActivities = extraGetData.Activity.filter(a => 
      a.Type === 'Unit' && 
      ((a.Name === firstUnitName) || (a.UnitName === firstUnitName)) && 
      a.Timestamp && a.StatusId
    );
    
    if (debug) {
      console.log(`Found ${validUnitActivities.length} activities for unit ${firstUnitName} in direct Activity array`);
    }
    
    // Extract timestamps from activities if found
    const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
    const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
    const backInServiceKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
    const backInServiceByKeyword = validUnitActivities.find(a => 
      a.StatusText && backInServiceKeywords.some(keyword => a.StatusText.toLowerCase().includes(keyword))
    );
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
  
  // Check if patient is the caller ("I am the patient")
  const isPatientCaller = (nature + ' ' + note).toLowerCase().includes('i am the patient');
  
  // Only set patient information if they are identified as the caller/patient
  if (!isPatientCaller) {
    // Clear patient info if they're not the patient
    patientFirstName = '';
    patientLastName = '';
  }
  
  // Format patient DOB if it's a valid date and patient info should be included
  let formattedDOB = '';
  if (isPatientCaller && externalId) {
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
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${loggedOn}</IncidentOrOnset>
  <DispatchNotified>${loggedOn}</DispatchNotified>
  <IncidentAddress1>${streetAddress}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CadDispatchText>${nature}</CadDispatchText>
  <EmsUnitCallSign>${unitNames.join(',')}</EmsUnitCallSign>
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

/**
 * Export a function with the name that sheets-logger.js is looking for
 * @param {Object} params - Parameters with call and extraData properties
 * @returns {string} XML string
 */
function generateXmlForCall(params) {
  if (!params || !params.call) {
    return '';
  }
  
  return generateXML(params.call, params.extraData || {});
}

module.exports = { 
  generateXML,
  generateXmlForCall
};