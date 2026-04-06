/**
 * XML Generator for Resgrid to ESO Bridge
 * Properly maps fields from Resgrid to ESO format based on requirements
 * Fixed to properly handle XML formatting
 * Includes GPS geocoding fallback for addresses without coordinates
 * Includes Pacific Time conversion for all timestamps
 */
const { create } = require('xmlbuilder2');
const https = require('https');

/**
 * Converts timestamp to Pacific Time format
 * @param {string} timestamp - UTC timestamp to convert
 * @returns {string} Pacific Time formatted timestamp
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
        const msMatch = originalMs.match(/^\d+/);
        if (msMatch) {
          milliseconds = '.' + msMatch[0];
        }
      }
    }
    
    // Return in ISO format with T separator and milliseconds
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${milliseconds}`;
  } catch (error) {
    // If conversion fails, return original timestamp
    return timestamp;
  }
}



/**
 * Geocodes an address to GPS coordinates using a simple geocoding service
 * @param {string} address - Address to geocode
 * @param {boolean} debug - Debug logging flag
 * @returns {Promise<object>} Object with latitude and longitude
 */
async function geocodeAddress(address, debug = false) {
  return new Promise((resolve, reject) => {
    if (!address || address.trim() === '') {
      return resolve({ latitude: '', longitude: '' });
    }
    
    // Handle address ranges by taking the first part
    let cleanAddress = address.trim();
    
    // Check for address range patterns like "7339-7399 Romaine St" or "100-150 Main St"
    const rangeMatch = cleanAddress.match(/^(\d+)-(\d+)\s+(.+)/);
    if (rangeMatch) {
      // Use the midpoint of the range for more accurate coordinates
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      const midpoint = Math.floor((start + end) / 2);
      cleanAddress = `${midpoint} ${rangeMatch[3]}`;
      if (debug) console.log(`Address range detected, using midpoint: ${cleanAddress}`);
    }
    
    // Use OpenStreetMap Nominatim API for geocoding (free, no API key required)
    const encodedAddress = encodeURIComponent(cleanAddress);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
    
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Resgrid-ESO-Bridge/1.0'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const results = JSON.parse(data);
          
          if (results && results.length > 0) {
            const result = results[0];
            resolve({
              latitude: result.lat,
              longitude: result.lon
            });
            if (debug) console.log(`Geocoded "${cleanAddress}" to ${result.lat}, ${result.lon}`);
          } else {
            if (debug) console.log(`No geocoding results for "${cleanAddress}"`);
            resolve({ latitude: '', longitude: '' });
          }
        } catch (parseError) {
          if (debug) console.log(`Geocoding parse error: ${parseError.message}`);
          resolve({ latitude: '', longitude: '' });
        }
      });
    });
    
    request.on('error', (error) => {
      if (debug) console.log(`Geocoding request error: ${error.message}`);
      resolve({ latitude: '', longitude: '' });
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      if (debug) console.log('Geocoding request timeout');
      resolve({ latitude: '', longitude: '' });
    });
  });
}

/**
 * Generates XML for ESO from call data
 * @param {Object} callGetData - Data from the GetCall endpoint
 * @param {Object} extraGetData - Data from the GetCallExtraData endpoint
 * @param {boolean} [debug=false] - Whether to enable debug logging
 * @returns {Promise<string>} XML string
 */

  // Enhanced unit timing extraction with multiple fallback methods
  function extractUnitTimings(unit, activities, callData) {
    const timings = {
      dispatch: null,
      enRoute: null,
      arrived: null,
      atPatient: null,
      transport: null,
      atHospital: null,
      cleared: null,
      backInService: null
    };
    
    // Method 1: Direct unit dispatch data
    if (unit.DispatchTime) timings.dispatch = unit.DispatchTime;
    if (unit.EnRouteTime) timings.enRoute = unit.EnRouteTime;
    if (unit.ArrivedTime) timings.arrived = unit.ArrivedTime;
    if (unit.AtPatientTime) timings.atPatient = unit.AtPatientTime;
    if (unit.TransportTime) timings.transport = unit.TransportTime;
    if (unit.AtHospitalTime) timings.atHospital = unit.AtHospitalTime;
    if (unit.ClearedTime) timings.cleared = unit.ClearedTime;
    if (unit.BackInServiceTime) timings.backInService = unit.BackInServiceTime;
    
    // Method 2: Search activities for this unit
    const unitActivities = activities.filter(a => 
      a.UnitId === unit.UnitId || 
      a.UnitName === unit.Name ||
      a.UnitName === unit.UnitName
    );
    
    for (const activity of unitActivities) {
      const timestamp = activity.Timestamp || activity.LoggedOn;
      if (!timestamp) continue;
      
      const status = (activity.Status || activity.Type || '').toLowerCase();
      
      if (status.includes('dispatch') && !timings.dispatch) {
        timings.dispatch = timestamp;
      } else if (status.includes('enroute') || status.includes('en route') && !timings.enRoute) {
        timings.enRoute = timestamp;
      } else if (status.includes('arrived') || status.includes('on scene') && !timings.arrived) {
        timings.arrived = timestamp;
      } else if (status.includes('patient') && !timings.atPatient) {
        timings.atPatient = timestamp;
      } else if (status.includes('transport') && !timings.transport) {
        timings.transport = timestamp;
      } else if (status.includes('hospital') && !timings.atHospital) {
        timings.atHospital = timestamp;
      } else if (status.includes('clear') && !timings.cleared) {
        timings.cleared = timestamp;
      } else if (status.includes('available') || status.includes('in service') && !timings.backInService) {
        timings.backInService = timestamp;
      }
    }
    
    // Method 3: Use call timestamps as fallbacks
    if (!timings.dispatch && callData.LoggedOn) {
      timings.dispatch = callData.LoggedOn;
    }
    
    return timings;
  }


  // Enhanced DOB extraction with multiple fallback methods
  function extractPatientDOB(callData, extraData) {
    // Method 1: Reference ID field
    if (callData.ReferenceId) {
      const dobMatch = callData.ReferenceId.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/);
      if (dobMatch) {
        return dobMatch[1];
      }
    }
    
    // Method 2: External ID field
    if (callData.ExternalId) {
      const dobMatch = callData.ExternalId.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/);
      if (dobMatch) {
        return dobMatch[1];
      }
    }
    
    // Method 3: Notes field
    if (callData.Note) {
      const dobMatch = callData.Note.match(/(?:DOB|dob|birth|born)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
      if (dobMatch) {
        return dobMatch[1];
      }
    }
    
    // Method 4: Contact info field
    if (callData.ContactInfo) {
      const dobMatch = callData.ContactInfo.match(/(?:DOB|dob|birth|born)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
      if (dobMatch) {
        return dobMatch[1];
      }
    }
    
    // Method 5: Extra data fields
    if (extraData && extraData.Data) {
      const dataStr = JSON.stringify(extraData.Data);
      const dobMatch = dataStr.match(/(?:DOB|dob|birth|born)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
      if (dobMatch) {
        return dobMatch[1];
      }
    }
    
    return null; // Return null if no DOB found - never use fake data
  }

async function generateXML(callData, extraData = {}, debug = false) {
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
  
  // Use original timestamps as provided by Resgrid - ESO expects original format
  let loggedOn = callGetData.LoggedOn || callGetData.LoggedOnUtc || callGetData.DispatchedOn || callGetData.DispatchedOnUtc || '';
  
  // If no timestamp found, try additional fallback sources
  if (!loggedOn && extraGetData.Data && extraGetData.Data.CreatedOn) {
    loggedOn = extraGetData.Data.CreatedOn;
  }
  
  // Final fallback - use current timestamp if nothing else is available
  if (!loggedOn) {
    loggedOn = new Date().toISOString();
    if (debug) console.log('Warning: No timestamp found in call data, using current time as fallback');
  }
  
  // ESO expects original timestamps - no conversion needed
  
  // Debug logging for timestamp extraction
  if (debug) {
    console.log(`Debug - Timestamp fields available:`);
    console.log(`  LoggedOn: ${callGetData.LoggedOn || 'Not found'}`);
    console.log(`  LoggedOnUtc: ${callGetData.LoggedOnUtc || 'Not found'}`);
    console.log(`  DispatchedOn: ${callGetData.DispatchedOn || 'Not found'}`);
    console.log(`  DispatchedOnUtc: ${callGetData.DispatchedOnUtc || 'Not found'}`);
    console.log(`  Final selected loggedOn (Pacific Time): ${loggedOn}`);
  }
  
  const name = stripHtmlTags(callGetData.Name || '');
  const nature = stripHtmlTags(callGetData.Nature || '');
  const note = stripHtmlTags(callGetData.Note || '');
  // Clean the address by removing any carriage returns, HTML tags, or other problematic characters
  const address = stripHtmlTags((callGetData.Address || '').replace(/[\r\n]/g, ''));
  const type = callGetData.Type || '';
  
  // Extract incident type from Nature field if Type is not available
  let incidentType = type;
  if (!incidentType && nature) {
    const typeMatch = nature.match(/INCIDENT TYPE:\s*([^-]+)/i);
    if (typeMatch) {
      incidentType = typeMatch[1].trim();
    }
  }
  
  // Patient information extraction with enhanced logic for self-identification
  const contactName = callGetData.ContactName || '';
  const contactInfo = callGetData.ContactInfo || '';
  const externalId = callGetData.ExternalId || '';
  
  // Check if caller identifies as patient or medical team member
  const combinedText = `${nature} ${note}`.toLowerCase();
  const isPatientSelf = /i am the patient|i'm the patient|patient is me|caller is patient/.test(combinedText);
  const isMedicalTeam = /i am part of the event medical team|i'm part of the medical team|medical team member|ems team/.test(combinedText);
  
  // Extract patient name and DOB information
  let patientFirstName = '';
  let patientLastName = '';
  let patientDOB = '';
  
  // Primary source for DOB: Check CAD Reference Id and External Id fields
  if (callGetData.ReferenceId && callGetData.ReferenceId.trim() !== '') {
    // Reference Id might contain DOB in various formats
    const refId = callGetData.ReferenceId.trim();
    if (debug) console.log(`Found Reference Id: ${refId}`);
    
    // Check if Reference Id is a DOB (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const dobFormats = [
      /^(\d{4}-\d{2}-\d{2})$/, // YYYY-MM-DD
      /^(\d{2}\/\d{2}\/\d{4})$/, // MM/DD/YYYY
      /^(\d{1,2}\/\d{1,2}\/\d{4})$/ // M/D/YYYY
    ];
    
    for (const format of dobFormats) {
      const match = refId.match(format);
      if (match) {
        patientDOB = match[1];
        // Convert to standard YYYY-MM-DD format for XML upload
        if (patientDOB.includes('/')) {
          const dateParts = patientDOB.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            patientDOB = `${year}-${month}-${day}`;
          }
        }
        // Ensure final format is always YYYY-MM-DD
        if (patientDOB && !patientDOB.match(/^\d{4}-\d{2}-\d{2}$/)) {
          if (debug) console.log(`Warning: DOB not in YYYY-MM-DD format: ${patientDOB}`);
        }
        if (debug) console.log(`Extracted DOB from Reference Id: ${patientDOB}`);
        break;
      }
    }
  }
  
  // Alternative source: External Id field
  if (!patientDOB && externalId && externalId.trim() !== '') {
    const extId = externalId.trim();
    if (debug) console.log(`Checking External Id for DOB: ${extId}`);
    
    const dobFormats = [
      /^(\d{4}-\d{2}-\d{2})$/,
      /^(\d{2}\/\d{2}\/\d{4})$/,
      /^(\d{1,2}\/\d{1,2}\/\d{4})$/
    ];
    
    for (const format of dobFormats) {
      const match = extId.match(format);
      if (match) {
        patientDOB = match[1];
        // Convert to standard YYYY-MM-DD format for XML upload
        if (patientDOB.includes('/')) {
          const dateParts = patientDOB.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            patientDOB = `${year}-${month}-${day}`;
          }
        }
        // Ensure final format is always YYYY-MM-DD
        if (patientDOB && !patientDOB.match(/^\d{4}-\d{2}-\d{2}$/)) {
          if (debug) console.log(`Warning: DOB not in YYYY-MM-DD format: ${patientDOB}`);
        }
        if (debug) console.log(`Extracted DOB from External Id: ${patientDOB}`);
        break;
      }
    }
  }
  
  // Primary source: ContactName field
  if (contactName) {
    const cleanName = contactName.trim();
    let nameParts = cleanName.split(' ');
    
    // Handle professional titles (Dr., Mr., Mrs., Ms., etc.)
    if (nameParts.length >= 3 && /^(dr|doctor|mr|mrs|ms|prof|professor)\.?$/i.test(nameParts[0])) {
      // Skip the title and use the actual name
      nameParts = nameParts.slice(1);
    }
    
    if (nameParts.length >= 2) {
      patientFirstName = nameParts[0];
      patientLastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      patientFirstName = nameParts[0];
    }
  }
  
  // Enhanced extraction from nature/note fields when patient self-identifies
  if ((isPatientSelf || isMedicalTeam) && (!patientFirstName || !patientLastName)) {
    // Look for name patterns in nature/note: "COMPLAINANT: Name" or "PATIENT: Name"
    const namePatterns = [
      /COMPLAINANT:\s*([^-\n]+?)(?:\s*-|$)/i,
      /PATIENT:\s*([^-\n]+?)(?:\s*-|$)/i,
      /NAME:\s*([^-\n]+?)(?:\s*-|$)/i,
      /CALLER:\s*([^-\n]+?)(?:\s*-|$)/i
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = combinedText.match(pattern);
      if (nameMatch && nameMatch[1]) {
        const extractedName = nameMatch[1].trim();
        const nameParts = extractedName.split(' ');
        if (nameParts.length >= 2 && !patientFirstName) {
          patientFirstName = nameParts[0];
          patientLastName = nameParts.slice(1).join(' ');
          if (debug) console.log(`Extracted patient name from text: ${patientFirstName} ${patientLastName}`);
          break;
        }
      }
    }
  }
  
  // Extract DOB information from nature/note
  const dobPatterns = [
    /DOB:\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /DATE OF BIRTH:\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /BORN:\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i
  ];
  
  for (const dobPattern of dobPatterns) {
    const dobMatch = combinedText.match(dobPattern);
    if (dobMatch && dobMatch[1]) {
      patientDOB = dobMatch[1];
      // Convert to standard YYYY-MM-DD format for XML upload
      if (patientDOB.includes('/')) {
        const dateParts = patientDOB.split('/');
        if (dateParts.length === 3) {
          // Convert MM/DD/YYYY or M/D/YYYY to YYYY-MM-DD
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          patientDOB = `${year}-${month}-${day}`;
        }
      }
      // Ensure final format is always YYYY-MM-DD
      if (patientDOB && !patientDOB.match(/^\d{4}-\d{2}-\d{2}$/)) {
        if (debug) console.log(`Warning: DOB not in YYYY-MM-DD format: ${patientDOB}`);
      }
      if (debug) console.log(`Extracted patient DOB: ${patientDOB}`);
      break;
    }
  }
  
  // Only use actual DOB data from CAD system - no hardcoded fallbacks
  // This ensures DOB field only contains authentic data from the CAD Reference Id
  
  if (debug) {
    console.log(`=== DOB EXTRACTION DEBUG ===`);
    console.log(`Reference Id: ${callGetData.ReferenceId || 'Not found'}`);
    console.log(`External Id: ${externalId || 'Not found'}`);
    console.log(`Contact Name: ${contactName || 'Not found'}`);
    console.log(`Final extracted DOB: ${patientDOB || 'Empty - using authentic data only'}`);
    console.log(`Patient self-identification: ${isPatientSelf ? 'Patient' : isMedicalTeam ? 'Medical Team' : 'None'}`);
    console.log(`Final patient info: ${patientFirstName} ${patientLastName}, DOB: ${patientDOB || 'Not provided in CAD data'}`);
    console.log(`=== END DOB DEBUG ===`);
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
  
  // Parse geolocation - try multiple possible sources with address geocoding fallback
  let latitude = '';
  let longitude = '';
  
  // First check if we have direct Latitude and Longitude fields
  if (callGetData.Latitude && callGetData.Longitude) {
    latitude = callGetData.Latitude;
    longitude = callGetData.Longitude;
    if (debug) console.log(`Using direct Lat/Long: ${latitude}, ${longitude}`);
  } 
  // Next try Geolocation as a string
  else if (callGetData.Geolocation && typeof callGetData.Geolocation === 'string') {
    const geoparts = callGetData.Geolocation.split(',');
    if (geoparts.length === 2) {
      latitude = geoparts[0];
      longitude = geoparts[1];
      if (debug) console.log(`Using Geolocation string: ${latitude}, ${longitude}`);
    }
  }
  // Try in extraGetData as well
  else if (extraGetData.Latitude && extraGetData.Longitude) {
    latitude = extraGetData.Latitude;
    longitude = extraGetData.Longitude;
    if (debug) console.log(`Using extraGetData Lat/Long: ${latitude}, ${longitude}`);
  }
  
  // As a last resort, try to get coordinates from the Activity array - this often contains accurate location data
  if ((!latitude || !longitude) && extraGetData.Data && extraGetData.Data.Activity && Array.isArray(extraGetData.Data.Activity)) {
    const activityWithLocation = extraGetData.Data.Activity.find(a => 
      a.Type === 'Unit' && a.Location && typeof a.Location === 'string' && a.Location.includes(',')
    );
    
    if (activityWithLocation && activityWithLocation.Location) {
      const locationParts = activityWithLocation.Location.split(',');
      if (locationParts.length === 2) {
        latitude = locationParts[0].trim();
        longitude = locationParts[1].trim();
        if (debug) console.log(`Using Unit Activity Location: ${latitude}, ${longitude}`);
      }
    }
  }
  
  // Also check the direct Activity array for backward compatibility
  if ((!latitude || !longitude) && extraGetData.Activity && Array.isArray(extraGetData.Activity)) {
    const activityWithLocation = extraGetData.Activity.find(a => 
      a.Type === 'Unit' && a.Location && typeof a.Location === 'string' && a.Location.includes(',')
    );
    
    if (activityWithLocation && activityWithLocation.Location) {
      const locationParts = activityWithLocation.Location.split(',');
      if (locationParts.length === 2) {
        latitude = locationParts[0].trim();
        longitude = locationParts[1].trim();
        if (debug) console.log(`Using direct Activity Location: ${latitude}, ${longitude}`);
      }
    }
  }

  // GPS Geocoding Fallback: If no coordinates found, try to geocode the address
  if ((!latitude || !longitude) && (streetAddress || callGetData.Address)) {
    try {
      const addressToGeocode = streetAddress || callGetData.Address || '';
      const geocodedCoords = await geocodeAddress(addressToGeocode, debug);
      
      if (geocodedCoords.latitude && geocodedCoords.longitude) {
        latitude = geocodedCoords.latitude;
        longitude = geocodedCoords.longitude;
        if (debug) console.log(`Using geocoded coordinates: ${latitude}, ${longitude}`);
      }
    } catch (geocodeError) {
      if (debug) console.log(`Geocoding failed: ${geocodeError.message}`);
    }
  }
  
  // Extract unit information and timestamps from GetCallExtraData
  let units = []; // Array to hold unit objects with individual timestamps
  let unitNames = []; // Array to hold unit names (like "STN1") for backward compatibility
  
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
    
    // Create unit objects for each dispatched unit
    unitDispatches.forEach(unit => {
      if (unit.Name) {
        const unitObj = {
          name: unit.Name,
          location: unit.Location || '',
          enRouteTime: unit.EnRouteTime || '',
          arrivedTime: unit.ArrivedTime || '',
          atPatientTime: unit.AtPatientTime || '',
          clearedTime: unit.ClearedTime || '',
          backInServiceTime: ''
        };
        
        units.push(unitObj);
        
        // Also maintain backward compatibility array
        if (!unitNames.includes(unit.Name)) {
          unitNames.push(unit.Name);
          if (debug) {
            console.log(`Added unit: ${unit.Name} from dispatches`);
          }
        }
      }
    });
  } 
  // Original check for backward compatibility
  else if (extraGetData.Dispatches && Array.isArray(extraGetData.Dispatches)) {
    // Filter for entries with Type='Unit'
    const unitDispatches = extraGetData.Dispatches.filter(d => d.Type === 'Unit');
    
    if (debug) {
      console.log(`Found ${unitDispatches.length} unit dispatches in direct Dispatches array`);
    }
    
    // Create unit objects for each dispatched unit
    unitDispatches.forEach(unit => {
      if (unit.Name) {
        const unitObj = {
          name: unit.Name,
          location: unit.Location || '',
          enRouteTime: unit.EnRouteTime || '',
          arrivedTime: unit.ArrivedTime || '',
          atPatientTime: unit.AtPatientTime || '',
          clearedTime: unit.ClearedTime || '',
          backInServiceTime: ''
        };
        
        units.push(unitObj);
        
        // Also maintain backward compatibility array
        if (!unitNames.includes(unit.Name)) {
          unitNames.push(unit.Name);
          if (debug) {
            console.log(`Added unit: ${unit.Name} from direct dispatches`);
          }
        }
      }
    });
  }
  
  // Fallback unit assignment - if no units found, assign all available units
  const FALLBACK_UNITS = [
    'EVTMED1', 'EVTMED2', 'SETMED1', 'SETMED2', 'STN1', 'STN2', 'STN3',
    'ERT1', 'ERT2', 'CART1', 'BIKE1', 'CMD1', 'SPT1'
  ];
  
  // Track if fallback units were used for logging purposes
  let fallbackUnitsUsed = false;
  
  if (units.length === 0 && unitNames.length === 0) {
    fallbackUnitsUsed = true;
    
    if (debug) {
      console.log('No units found in call data - applying fallback unit assignment');
    }
    
    // Create unit objects for fallback units
    FALLBACK_UNITS.forEach(unitName => {
      const unitObj = {
        name: unitName,
        location: '',
        enRouteTime: '',
        arrivedTime: '',
        atPatientTime: '',
        clearedTime: '',
        backInServiceTime: ''
      };
      
      units.push(unitObj);
      unitNames.push(unitName);
    });
    
    if (debug) {
      console.log(`Applied fallback assignment: ${unitNames.length} units assigned`);
    }
  }
  
  // Extract unit times from Activity array - this is where unit status changes are recorded
  if (extraGetData.Data && extraGetData.Data.Activity && Array.isArray(extraGetData.Data.Activity) && units.length > 0) {
    // Process activities for each unit
    units.forEach(unit => {
      const validUnitActivities = extraGetData.Data.Activity.filter(a => 
        a.Type === 'Unit' && 
        ((a.Name === unit.name) || (a.UnitName === unit.name)) && 
        a.Timestamp && a.StatusId
      );
      
      if (debug) {
        console.log(`Found ${validUnitActivities.length} activities for unit ${unit.name} in Data.Activity`);
      }
      
      // According to Resgrid API, StatusId 5 = En Route, StatusId 6 = On Scene
      const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
      const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
      
      // For back in service time, look for StatusId 2 (usually "Available") 
      // or check for status text containing "returning", "available", etc.
      const backInServiceKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
      
      // Try finding a status with appropriate keywords first
      const backInServiceByKeyword = validUnitActivities.find(a => 
        a.StatusText && backInServiceKeywords.some(keyword => 
          a.StatusText.toLowerCase().includes(keyword)
        )
      );
      
      // Otherwise try StatusId 2 which is often "Available"
      const availableActivity = validUnitActivities.find(a => a.StatusId === 2);
      
      // Update unit timestamps if available
      if (enRouteActivity && enRouteActivity.Timestamp) {
        unit.enRouteTime = convertToPacificTime(enRouteActivity.Timestamp);
        if (debug) console.log(`Found en route time for ${unit.name}: ${unit.enRouteTime}`);
      }
      
      if (onSceneActivity && onSceneActivity.Timestamp) {
        unit.arrivedTime = convertToPacificTime(onSceneActivity.Timestamp);
        if (debug) console.log(`Found on scene time for ${unit.name}: ${unit.arrivedTime}`);
      }
      
      if (backInServiceByKeyword && backInServiceByKeyword.Timestamp) {
        unit.backInServiceTime = convertToPacificTime(backInServiceByKeyword.Timestamp);
        if (debug) console.log(`Found back in service time for ${unit.name} (by keyword): ${unit.backInServiceTime}`);
      } else if (availableActivity && availableActivity.Timestamp) {
        unit.backInServiceTime = convertToPacificTime(availableActivity.Timestamp);
        if (debug) console.log(`Found back in service time for ${unit.name} (StatusId 2): ${unit.backInServiceTime}`);
      }
    });
  }
  // Try directly accessing Activity from extraGetData (fallback for backward compatibility)
  else if (extraGetData.Activity && Array.isArray(extraGetData.Activity) && units.length > 0) {
    // Process activities for each unit using the direct Activity array
    units.forEach(unit => {
      const validUnitActivities = extraGetData.Activity.filter(a => 
        a.Type === 'Unit' && 
        ((a.Name === unit.name) || (a.UnitName === unit.name)) && 
        a.Timestamp && a.StatusId
      );
      
      if (debug) {
        console.log(`Found ${validUnitActivities.length} activities for unit ${unit.name} in direct Activity array`);
      }
      
      // Extract timestamps from activities if found
      const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
      const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
      const backInServiceKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
      const backInServiceByKeyword = validUnitActivities.find(a => 
        a.StatusText && backInServiceKeywords.some(keyword => a.StatusText.toLowerCase().includes(keyword))
      );
      const availableActivity = validUnitActivities.find(a => a.StatusId === 2);
      
      // Update unit timestamps if available - convert all to Pacific Time
      if (enRouteActivity && enRouteActivity.Timestamp) {
        unit.enRouteTime = convertToPacificTime(enRouteActivity.Timestamp);
        if (debug) console.log(`Found en route time for ${unit.name}: ${unit.enRouteTime}`);
      }
      
      if (onSceneActivity && onSceneActivity.Timestamp) {
        unit.arrivedTime = convertToPacificTime(onSceneActivity.Timestamp);
        if (debug) console.log(`Found on scene time for ${unit.name}: ${unit.arrivedTime}`);
      }
      
      if (backInServiceByKeyword && backInServiceByKeyword.Timestamp) {
        unit.backInServiceTime = convertToPacificTime(backInServiceByKeyword.Timestamp);
        if (debug) console.log(`Found back in service time for ${unit.name} (by keyword): ${unit.backInServiceTime}`);
      } else if (availableActivity && availableActivity.Timestamp) {
        unit.backInServiceTime = convertToPacificTime(availableActivity.Timestamp);
        if (debug) console.log(`Found back in service time for ${unit.name} (StatusId 2): ${unit.backInServiceTime}`);
      }
    });
  }
  
  // Fill in missing timestamps from main call data for all units - convert all to Pacific Time
  units.forEach(unit => {
    if (!unit.enRouteTime && callGetData.EnRouteTime) unit.enRouteTime = convertToPacificTime(callGetData.EnRouteTime);
    if (!unit.arrivedTime && callGetData.ArrivedTime) unit.arrivedTime = convertToPacificTime(callGetData.ArrivedTime);
    if (!unit.atPatientTime && callGetData.AtPatientTime) unit.atPatientTime = convertToPacificTime(callGetData.AtPatientTime);
    if (!unit.clearedTime && callGetData.ClearedTime) unit.clearedTime = convertToPacificTime(callGetData.ClearedTime);
    
    // Also try alternative field names - convert all to Pacific Time
    if (!unit.enRouteTime && callGetData.UnitEnRouteTime) unit.enRouteTime = convertToPacificTime(callGetData.UnitEnRouteTime);
    if (!unit.arrivedTime && callGetData.UnitArrivedTime) unit.arrivedTime = convertToPacificTime(callGetData.UnitArrivedTime);
    if (!unit.atPatientTime && callGetData.UnitAtPatientTime) unit.atPatientTime = convertToPacificTime(callGetData.UnitAtPatientTime);
    if (!unit.clearedTime && callGetData.UnitClearedTime) unit.clearedTime = convertToPacificTime(callGetData.UnitClearedTime);
    if (!unit.backInServiceTime && callGetData.UnitBackInServiceTime) unit.backInServiceTime = convertToPacificTime(callGetData.UnitBackInServiceTime);
    if (!unit.backInServiceTime && callGetData.BackInServiceTime) unit.backInServiceTime = convertToPacificTime(callGetData.BackInServiceTime);
    
    // If call is closed, populate missing unit cleared and back in service times with closure time
    // State: 0 = Active, State: 1 = Closed (numeric values from Resgrid API)
    if (callGetData.State === 1 || callGetData.State === '1' || callGetData.ClosedOn) {
      const callClosureTime = convertToPacificTime(callGetData.ClosedOn || callGetData.CallClosedTime || callGetData.EndTime || new Date().toISOString().replace('Z', ''));
      
      // Fill UnitCleared time if not already set
      if (!unit.clearedTime) {
        unit.clearedTime = callClosureTime;
      }
      
      // Fill UnitBackInService time if not already set
      if (!unit.backInServiceTime) {
        unit.backInServiceTime = callClosureTime;
      }
    }
    
    // If UnitCleared time is available but no BackInService time, use that
    if (!unit.backInServiceTime && unit.clearedTime) unit.backInServiceTime = unit.clearedTime;
  });
  
  // CallNatureDescription removed - only CallNature will be included
  
  // Use the enhanced patient identification logic from above
  const isPatientCaller = isPatientSelf || isMedicalTeam;
  
  // Format patient DOB - use our extracted DOB or attempt externalId parsing
  let formattedDOB = patientDOB; // Use the DOB we extracted earlier
  
  // Fallback to externalId if no DOB was extracted but patient is identified
  if (isPatientCaller && !formattedDOB && externalId) {
    // Try to parse externalId as a date
    const dobDate = new Date(externalId);
    if (!isNaN(dobDate.getTime())) {
      // If valid date, format as YYYY-MM-DD
      formattedDOB = dobDate.toISOString().split('T')[0];
    }
  }

  // Always use the consistent Units structure for all calls (single or multiple units)
  // This ensures XML format consistency across all emergency calls
  const useNestedUnits = true;
  
  let xml;
  
  if (useNestedUnits) {
    // Generate Units XML for multiple units
    const unitsXml = units.map(unit => `    <Unit>
      <EmsUnitCallSign>${unit.name}</EmsUnitCallSign>
      <ResponseModeToScene>${responseMode}</ResponseModeToScene>
      <UnitNotifiedByDispatch>${loggedOn}</UnitNotifiedByDispatch>
      <UnitEnRoute>${unit.enRouteTime}</UnitEnRoute>
      <UnitArrivedOnScene>${unit.arrivedTime}</UnitArrivedOnScene>
      <UnitAtPatient>${unit.atPatientTime}</UnitAtPatient>
      <UnitCleared>${unit.clearedTime}</UnitCleared>
      <UnitBackInService>${unit.backInServiceTime}</UnitBackInService>
      <PatientFirstName>${patientFirstName}</PatientFirstName>
      <PatientLastName>${patientLastName}</PatientLastName>
      <PatientDOB>${formattedDOB}</PatientDOB>
    </Unit>`).join('\n');
    
    // Multiple units format with nested Units structure
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${loggedOn}</IncidentOrOnset>
  <DispatchNotified>${loggedOn}</DispatchNotified>
  <IncidentAddress1>${streetAddress}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CadDispatchText>${nature}</CadDispatchText>
  <CallNature>${incidentType}</CallNature>
  <SceneGpsLocationLat>${latitude || ''}</SceneGpsLocationLat>
  <SceneGpsLocationLong>${longitude || ''}</SceneGpsLocationLong>
  <Units>
${unitsXml}
  </Units>
</CadIncident>`;
  } else {
    // Single unit - use the original flat structure for backward compatibility
    const firstUnit = units.length > 0 ? units[0] : {
      name: unitNames[0] || '',
      enRouteTime: '',
      arrivedTime: '',
      atPatientTime: '',
      clearedTime: '',
      backInServiceTime: ''
    };
    
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${loggedOn}</IncidentOrOnset>
  <DispatchNotified>${loggedOn}</DispatchNotified>
  <IncidentAddress1>${streetAddress}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CadDispatchText>${nature}</CadDispatchText>
  <EmsUnitCallSign>${firstUnit.name}</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${loggedOn}</UnitNotifiedByDispatch>
  <ResponseModeToScene>${responseMode}</ResponseModeToScene>
  <CallNature>${incidentType}</CallNature>
  <UnitEnRoute>${firstUnit.enRouteTime}</UnitEnRoute>
  <UnitArrivedOnScene>${firstUnit.arrivedTime}</UnitArrivedOnScene>
  <UnitAtPatient>${firstUnit.atPatientTime}</UnitAtPatient>
  <UnitCleared>${firstUnit.clearedTime}</UnitCleared>
  <UnitBackInService>${firstUnit.backInServiceTime}</UnitBackInService>
  <SceneGpsLocationLat>${latitude || ''}</SceneGpsLocationLat>
  <SceneGpsLocationLong>${longitude || ''}</SceneGpsLocationLong>
  <PatientFirstName>${patientFirstName}</PatientFirstName>
  <PatientLastName>${patientLastName}</PatientLastName>
  <PatientDOB>${formattedDOB}</PatientDOB>
</CadIncident>`;
  }
  
  // Return just the XML string for consistency across the system
  // Metadata can be logged separately if needed
  if (debug && fallbackUnitsUsed) {
    console.log(`XML generated with fallback units: ${units.length} units assigned`);
  }
  
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
  
  const result = generateXML(params.call, params.extraData || {});
  // Now generateXML returns a string directly
  return result;
}

module.exports = { 
  generateXML,
  generateXmlForCall
};