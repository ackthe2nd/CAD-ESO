/**
 * XML Generator for Resgrid to ESO Bridge - Pacific Time Edition
 * Converts ALL timestamp fields to Pacific Time while preserving original format
 */
const { create } = require('xmlbuilder2');
const https = require('https');

/**
 * Converts a timestamp to Pacific Time with DST awareness while maintaining the same format
 * @param {string} timestamp - Input timestamp (UTC or local)
 * @returns {string} Timestamp converted to Pacific Time in same format
 */
function convertToPacificTime(timestamp) {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }
  
  try {
    // Parse the input timestamp
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return timestamp; // Return original if invalid
    }
    
    // Convert to Pacific Time with automatic DST handling
    // Create a new date object in Pacific timezone
    const pacificFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const pacificParts = pacificFormatter.formatToParts(date);
    const year = pacificParts.find(part => part.type === 'year').value;
    const month = pacificParts.find(part => part.type === 'month').value;
    const day = pacificParts.find(part => part.type === 'day').value;
    const hours = pacificParts.find(part => part.type === 'hour').value;
    const minutes = pacificParts.find(part => part.type === 'minute').value;
    const seconds = pacificParts.find(part => part.type === 'second').value;
    
    // Preserve milliseconds if they exist in original
    let milliseconds = '';
    if (timestamp.includes('.')) {
      const originalMs = timestamp.split('.')[1];
      if (originalMs) {
        // Extract only numeric part before any timezone info
        const msMatch = originalMs.match(/^\d+/);
        if (msMatch) {
          milliseconds = '.' + msMatch[0];
        }
      }
    }
    
    const pacificTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    // Maintain original format with T separator if present
    if (timestamp.includes('T')) {
      return `${pacificTime.replace(' ', 'T')}${milliseconds}`;
    } else {
      return `${pacificTime}${milliseconds}`;
    }
  } catch (error) {
    // If conversion fails, return original timestamp
    return timestamp;
  }
}

/**
 * Processes all timestamp fields in call data and converts them to Pacific Time
 * @param {object} callData - Call data object
 * @param {object} extraData - Extra call data object
 * @returns {object} Processed data with Pacific Time timestamps
 */
function convertAllTimestampsToPacific(callData, extraData) {
  const processedCallData = { ...callData };
  const processedExtraData = { ...extraData };
  
  // Convert main call timestamps
  if (processedCallData.LoggedOn) {
    processedCallData.LoggedOn = convertToPacificTime(processedCallData.LoggedOn);
  }
  if (processedCallData.LoggedOnUtc) {
    processedCallData.LoggedOnUtc = convertToPacificTime(processedCallData.LoggedOnUtc);
  }
  if (processedCallData.DispatchedOn) {
    processedCallData.DispatchedOn = convertToPacificTime(processedCallData.DispatchedOn);
  }
  if (processedCallData.DispatchedOnUtc) {
    processedCallData.DispatchedOnUtc = convertToPacificTime(processedCallData.DispatchedOnUtc);
  }
  
  // Convert unit-related timestamps
  if (processedCallData.EnRouteTime) {
    processedCallData.EnRouteTime = convertToPacificTime(processedCallData.EnRouteTime);
  }
  if (processedCallData.ArrivedTime) {
    processedCallData.ArrivedTime = convertToPacificTime(processedCallData.ArrivedTime);
  }
  if (processedCallData.AtPatientTime) {
    processedCallData.AtPatientTime = convertToPacificTime(processedCallData.AtPatientTime);
  }
  if (processedCallData.ClearedTime) {
    processedCallData.ClearedTime = convertToPacificTime(processedCallData.ClearedTime);
  }
  if (processedCallData.UnitNotifiedTime) {
    processedCallData.UnitNotifiedTime = convertToPacificTime(processedCallData.UnitNotifiedTime);
  }
  if (processedCallData.UnitEnRouteTime) {
    processedCallData.UnitEnRouteTime = convertToPacificTime(processedCallData.UnitEnRouteTime);
  }
  if (processedCallData.UnitArrivedTime) {
    processedCallData.UnitArrivedTime = convertToPacificTime(processedCallData.UnitArrivedTime);
  }
  
  // Convert extra data timestamps
  if (processedExtraData.Data) {
    if (processedExtraData.Data.CreatedOn) {
      processedExtraData.Data.CreatedOn = convertToPacificTime(processedExtraData.Data.CreatedOn);
    }
    if (processedExtraData.Data.LoggedOn) {
      processedExtraData.Data.LoggedOn = convertToPacificTime(processedExtraData.Data.LoggedOn);
    }
    if (processedExtraData.Data.LoggedOnUtc) {
      processedExtraData.Data.LoggedOnUtc = convertToPacificTime(processedExtraData.Data.LoggedOnUtc);
    }
    
    // Convert activity timestamps
    if (processedExtraData.Data.Activity && Array.isArray(processedExtraData.Data.Activity)) {
      processedExtraData.Data.Activity = processedExtraData.Data.Activity.map(activity => ({
        ...activity,
        Timestamp: activity.Timestamp ? convertToPacificTime(activity.Timestamp) : activity.Timestamp
      }));
    }
    
    // Convert dispatch timestamps
    if (processedExtraData.Data.Dispatches && Array.isArray(processedExtraData.Data.Dispatches)) {
      processedExtraData.Data.Dispatches = processedExtraData.Data.Dispatches.map(dispatch => ({
        ...dispatch,
        DispatchedOn: dispatch.DispatchedOn ? convertToPacificTime(dispatch.DispatchedOn) : dispatch.DispatchedOn,
        CreatedOn: dispatch.CreatedOn ? convertToPacificTime(dispatch.CreatedOn) : dispatch.CreatedOn
      }));
    }
  }
  
  return { callData: processedCallData, extraData: processedExtraData };
}

/**
 * Generate XML with Pacific Time conversion for all timestamps
 * @param {object} callGetData - Call data from API
 * @param {object} extraGetData - Extra call data from API
 * @param {boolean} debug - Enable debug logging
 * @returns {Promise<string>} Generated XML string with Pacific Time timestamps
 */
async function generateXMLWithPacificTime(callGetData, extraGetData, debug = false) {
  try {
    // Convert all timestamps to Pacific Time first
    const { callData, extraData } = convertAllTimestampsToPacific(callGetData, extraGetData);
    
    if (debug) {
      console.log('Pacific Time conversion applied to all timestamp fields');
    }
    
    // Import the original XML generator
    const originalGenerator = require('./xml-generator');
    
    // Generate XML using converted timestamps
    const result = await originalGenerator.generateXML(callData, extraData, debug);
    
    // Ensure we return a string, not an object
    if (typeof result === 'object' && result.xml) {
      return result.xml;
    }
    
    return result;
    
  } catch (error) {
    console.error('Error in Pacific Time XML generation:', error);
    throw error;
  }
}

module.exports = {
  generateXML: generateXMLWithPacificTime,
  convertToPacificTime,
  convertAllTimestampsToPacific
};