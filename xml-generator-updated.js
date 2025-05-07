/**
 * XML Generator for Resgrid to ESO Bridge
 * Updated to match the exact format required
 * FIXED to use template strings for reliable XML generation
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Generates XML for ESO from call data
 * @param {Object} callData - Combined call data
 * @returns {string} XML string
 */
function generateXML(callData) {
  // Use fixed GUID as specified
  const guid = "b394de98-a5b7-408d-a1f2-020eddff92b9";
  
  // Clean and prepare address
  const address = (callData.AddressLine1 || callData.FullAddress || callData.Address || '').replace(/[\r\n]/g, '');
  
  // Extract other fields with fallbacks
  const callId = callData.CallId || '';
  const loggedOn = callData.LoggedOn || callData.Timestamp || new Date().toISOString();
  const complaintReported = callData.Name || callData.Nature || '';
  const city = callData.City || '';
  const state = callData.State || '';
  const zip = callData.ZipCode || callData.Zip || '';
  const dispatchText = callData.Note || callData.Notes || '';
  const unitCallSign = callData.UnitsCsv || '';
  
  // Add priority information
  const priorityId = callData.Priority && callData.Priority.Id ? callData.Priority.Id : '1560'; // Default to high priority
  
  // Map priority ID to response mode
  // 1560 = Emergent (lights & sirens) = 390
  // 1559 = Non-emergent (no lights & sirens) = 395
  const responseModeMap = {
    "1560": "390", // Emergent -> lights & sirens
    "1559": "395"  // Non-emergent -> no lights & sirens
  };
  const responseMode = responseModeMap[priorityId] || "390"; // Default to lights & sirens
  
  // Add call nature
  const callNature = callData.CallNature || callData.Name || callData.Nature || '';
  
  // Add call description
  const callDescription = callData.CallNatureDescription || callData.Note || callData.Notes || '';
  
  // Timestamps
  const unitEnRouteTime = callData.UnitEnRouteTime || '';
  const unitArrivedTime = callData.UnitArrivedTime || '';
  const dispatchClosedTime = callData.DispatchClosedTime || '';
  
  // GPS coordinates
  const latitude = callData.Latitude || '';
  const longitude = callData.Longitude || '';
  
  // Generate XML using template string for reliable formatting
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>${guid}</Guid>
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${loggedOn}</IncidentOrOnset>
  <DispatchNotified>${loggedOn}</DispatchNotified>
  <ComplaintReportedByDispatch>${complaintReported}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${address}</VehicleDispatchLocation>
  <IncidentAddress1>${address}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CadDispatchText>${dispatchText}</CadDispatchText>
  <EmsUnitCallSign>${unitCallSign}</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${unitCallSign}</UnitNotifiedByDispatch>
  <Priority>${priorityId}</Priority>
  <ResponseModeToScene>${responseMode}</ResponseModeToScene>
  <CallNature>${callNature}</CallNature>
  <CallNatureDescription>${callDescription}</CallNatureDescription>
  <UnitEnRoute>${unitEnRouteTime}</UnitEnRoute>
  <UnitArrivedOnScene>${unitArrivedTime}</UnitArrivedOnScene>
  <UnitAtPatient></UnitAtPatient>
  <UnitCleared>${dispatchClosedTime}</UnitCleared>
  <SceneGpsLocationLat>${latitude}</SceneGpsLocationLat>
  <SceneGpsLocationLong>${longitude}</SceneGpsLocationLong>
</CadIncident>`;
  
  return xml;
}

module.exports = { generateXML };