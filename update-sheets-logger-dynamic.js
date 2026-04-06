/**
 * Update Sheets Logger with Dynamic Header System
 * Replaces the main sheetCallRow function to use header-based column mapping
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

function createUpdatedSheetsLogger() {
  const originalFile = path.join(__dirname, 'src', 'sheets-logger.js');
  
  // Read the original file
  let content = fs.readFileSync(originalFile, 'utf8');
  
  // Replace the sheetCallRow function with dynamic header version
  const newSheetCallRowFunction = `
/**
 * Log call data to the Call Data sheet with dynamic header mapping
 * @param {Object} callData - The call data object to log
 * @param {Object} extraData - Extra call data (optional)
 * @returns {Promise<boolean>} Success status
 */
async function sheetCallRow(callData, extraData = {}) {
  try {
    const startTime = Date.now();
    logger.info(\`Starting to log call to Google Sheets...\`);

    if (!sheetsClient) {
      logger.info(\`Sheets client not initialized, initializing now...\`);
      if (!(await initialize())) {
        logger.error(\`Failed to initialize Google Sheets before logging call\`);
        return false;
      }
    }

    // Extract data from the nested structure if needed
    let callGetData;
    let extraGetData;
    
    if (callData.Data) {
      callGetData = callData.Data;
      extraGetData = extraData.Data || callData.Data || {};
    } else if (callData.GetCall && callData.GetCall.Data) {
      callGetData = callData.GetCall.Data;
      extraGetData = callData.GetCallExtraData?.Data || {};
    } else {
      callGetData = callData;
      extraGetData = extraData || {};
    }

    // Get current sheet headers for dynamic mapping
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: \`\${CALLS_SHEET_NAME}!1:1\`
    });
    
    const headers = headersResponse.data.values ? headersResponse.data.values[0] : [];
    const headerMapping = createHeaderMapping(headers);
    
    // Strip HTML tags function
    function stripHtmlTags(str) {
      if (!str || typeof str !== 'string') {
        return str || '';
      }
      return str.replace(/<\\/?[^>]+(>|$)/g, '').trim();
    }

    // Parse GPS coordinates
    function parseGPSCoordinates(geolocation) {
      if (!geolocation || typeof geolocation !== 'string') {
        return { latitude: '', longitude: '' };
      }
      const parts = geolocation.split(',');
      if (parts.length === 2) {
        return {
          latitude: parts[0].trim(),
          longitude: parts[1].trim()
        };
      }
      return { latitude: '', longitude: '' };
    }

    // Extract GPS coordinates
    const gpsCoords = parseGPSCoordinates(callGetData.Geolocation);

    // Extract units
    const units = [];
    const data = extraGetData.Data || extraGetData;
    
    if (data.Dispatches) {
      data.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
        if (unit.Name && !units.includes(unit.Name)) {
          units.push(unit.Name);
        }
      });
    }

    // Parse address components
    const address = stripHtmlTags((callGetData.Address || '').replace(/[\\r\\n]/g, ''));
    const addressParts = address.split(',').map(p => p.trim());
    const city = addressParts[1] || '';
    const stateZip = addressParts[2] || '';
    const state = stateZip.split(' ')[0] || '';
    const zip = stateZip.split(' ')[1] || '';

    // Extract timestamps from activities
    let enRouteTime = '';
    let onSceneTime = '';
    let atPatientTime = '';
    let clearedTime = '';
    let backInServiceTime = '';
    
    const activityData = data.Activity || extraGetData.Activity;
    if (activityData && Array.isArray(activityData)) {
      const unitActivities = activityData.filter(a => a.Type === 'Unit' && units.includes(a.Name));
      
      const enRouteActivities = unitActivities.filter(a => a.StatusId === 5);
      const onSceneActivities = unitActivities.filter(a => a.StatusId === 6);
      const atPatientActivities = unitActivities.filter(a => a.StatusId === 3);
      const clearedActivities = unitActivities.filter(a => a.StatusId === 8);
      const backInServiceActivities = unitActivities.filter(a => a.StatusId === 2);
      
      if (enRouteActivities.length > 0) {
        enRouteTime = enRouteActivities[0].Timestamp || '';
      }
      if (onSceneActivities.length > 0) {
        onSceneTime = onSceneActivities[0].Timestamp || '';
      }
      if (atPatientActivities.length > 0) {
        atPatientTime = atPatientActivities[0].Timestamp || '';
      }
      if (clearedActivities.length > 0) {
        clearedTime = clearedActivities[clearedActivities.length - 1].Timestamp || '';
      }
      if (backInServiceActivities.length > 0) {
        backInServiceTime = backInServiceActivities[backInServiceActivities.length - 1].Timestamp || '';
      }
    }

    // Response mode logic
    let responseMode = '395';
    if (callGetData.Priority) {
      const priorityId = typeof callGetData.Priority === 'object' ? callGetData.Priority.Id : callGetData.Priority;
      if (priorityId === 1560) {
        responseMode = '390';
      }
    }

    // Create data object with all fields
    const dataFields = {
      timestamp: new Date().toISOString(),
      callId: callGetData.CallId || '',
      callTitle: stripHtmlTags(callGetData.Name || ''),
      incidentType: stripHtmlTags(callGetData.Type || ''),
      nature: stripHtmlTags(callGetData.Nature || ''),
      note: stripHtmlTags(callGetData.Note || ''),
      address: address,
      city: city,
      state: state,
      zip: zip,
      latitude: gpsCoords.latitude,
      longitude: gpsCoords.longitude,
      units: units.join(', '),
      unitCount: units.length,
      priorityId: callGetData.Priority ? (typeof callGetData.Priority === 'object' ? callGetData.Priority.Id : callGetData.Priority) : '',
      priorityName: callGetData.Priority ? (typeof callGetData.Priority === 'object' ? callGetData.Priority.Name : '') : '',
      responseMode: responseMode,
      contactName: callGetData.ContactName || '',
      contactInfo: callGetData.ContactInfo || '',
      externalId: callGetData.ExternalId || '',
      loggedOn: callGetData.LoggedOn || '',
      closedOn: callGetData.ClosedOn || '',
      departmentId: callGetData.DepartmentId || '',
      callSource: callGetData.CallSource || '',
      isDeleted: callGetData.IsDeleted || false,
      state: callGetData.State || '',
      enRouteTime: enRouteTime,
      onSceneTime: onSceneTime,
      atPatientTime: atPatientTime,
      clearedTime: clearedTime,
      backInServiceTime: backInServiceTime,
      xml: '', // Will be filled by generateXML function
      xmlSize: 0,
      uploadStatus: 'Failed: Authentication Error',
      uploadUrl: '',
      lastUpdated: new Date().toISOString()
    };

    // Generate XML using existing function
    try {
      const { generateXML } = require('./xml-generator');
      const xml = generateXML(callData, extraData);
      dataFields.xml = xml;
      dataFields.xmlSize = xml.length;
    } catch (xmlError) {
      logger.warn(\`Failed to generate XML: \${xmlError.message}\`);
    }

    // Create row array based on header mapping
    const maxColumns = Math.max(...Object.values(headerMapping)) + 1;
    const row = new Array(maxColumns).fill('');
    
    // Fill row based on header mapping
    Object.entries(headerMapping).forEach(([fieldName, columnIndex]) => {
      if (dataFields.hasOwnProperty(fieldName)) {
        row[columnIndex] = dataFields[fieldName];
      }
    });

    // Check if call already exists
    const callIdIndex = headerMapping.callId;
    if (callIdIndex !== undefined) {
      const maxColumn = String.fromCharCode(65 + Math.max(row.length - 1, 25));
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: \`\${CALLS_SHEET_NAME}!A:\${maxColumn}\`
      });
      
      const existingRows = response.data.values || [];
      let existingRowIndex = -1;
      
      for (let i = 1; i < existingRows.length; i++) {
        if (existingRows[i] && existingRows[i][callIdIndex] === dataFields.callId) {
          existingRowIndex = i;
          break;
        }
      }
      
      if (existingRowIndex >= 0) {
        // Update existing row
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range: \`\${CALLS_SHEET_NAME}!A\${existingRowIndex + 1}\`,
          valueInputOption: 'RAW',
          resource: {
            values: [row]
          }
        });
        logger.info(\`Updated existing call \${dataFields.callId} in Google Sheets\`);
      } else {
        // Add new row
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId,
          range: \`\${CALLS_SHEET_NAME}!A:ZZ\`,
          valueInputOption: 'RAW',
          resource: {
            values: [row]
          }
        });
        logger.info(\`Added new call \${dataFields.callId} to Google Sheets\`);
      }
    } else {
      // Fallback: append without checking for duplicates
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: \`\${CALLS_SHEET_NAME}!A:ZZ\`,
        valueInputOption: 'RAW',
        resource: {
          values: [row]
        }
      });
      logger.info(\`Added call data to Google Sheets (no Call ID column found)\`);
    }

    const endTime = Date.now();
    logger.info(\`Google Sheets logging completed in \${endTime - startTime}ms\`);
    return true;

  } catch (error) {
    logger.error(\`Error logging call to Google Sheets: \${error.message}\`, { error });
    return false;
  }
}`;

  // Find and replace the existing sheetCallRow function
  const functionStart = content.indexOf('async function sheetCallRow(');
  if (functionStart === -1) {
    console.log('Could not find sheetCallRow function to replace');
    return false;
  }

  // Find the end of the function by counting braces
  let braceCount = 0;
  let functionEnd = functionStart;
  let inFunction = false;
  
  for (let i = functionStart; i < content.length; i++) {
    const char = content[i];
    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }

  // Replace the function
  const beforeFunction = content.substring(0, functionStart);
  const afterFunction = content.substring(functionEnd);
  const newContent = beforeFunction + newSheetCallRowFunction + afterFunction;

  // Write the updated file
  fs.writeFileSync(originalFile, newContent);
  console.log('Updated sheets-logger.js with dynamic header system');
  
  return true;
}

// Run the update
if (createUpdatedSheetsLogger()) {
  console.log('✓ Sheets logger updated successfully');
  console.log('✓ Call Data exports now use dynamic header mapping');
  console.log('✓ You can rearrange columns in any order without breaking functionality');
} else {
  console.log('✗ Failed to update sheets logger');
}