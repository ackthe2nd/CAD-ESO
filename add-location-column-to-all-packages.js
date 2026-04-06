/**
 * Add Location Column to All Deployment Packages
 * Ensures consistent Location column implementation across all sheets-logger.js files
 */

const fs = require('fs');
const path = require('path');

// All deployment package directories and files that need Location column
const filesToUpdate = [
  'deployment-package/src/sheets-logger.js',
  'deployment-package-v1.7.0/src/sheets-logger.js',
  'deployment-package-v1.7.0/sheets-logger.js',
  'deployment-package-v1.7.2/src/sheets-logger.js',
  'deployment-package-v1.8.0/src/sheets-logger.js',
  'deployment-package-v2.0.0/src/sheets-logger.js',
  'deployment-package-v2.1.0/src/sheets-logger.js',
  'deployment-package-v2.1.1/src/sheets-logger.js',
  'deployment-package-v2.1.2/src/sheets-logger.js',
  'resgrid-eso-bridge-v2.0-deployment/src/sheets-logger.js',
  'final-deployment/src/sheets-logger.js',
  'final-deployment-v1.7.1/src/sheets-logger.js',
  'update-package/sheets-logger.js'
];

function addLocationColumnToFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Add extractLocationFromIncidentDetails function after convertToPacificTime function
    const locationFunctionExists = content.includes('extractLocationFromIncidentDetails');
    if (!locationFunctionExists) {
      const insertAfter = /function convertToPacificTime\(utcTimestamp\)[^}]+}\s*\n/;
      if (insertAfter.test(content)) {
        const locationFunction = `
/**
 * Extract location data from Incident Details field
 * @param {string} incidentDetails - The incident details text
 * @returns {string} Extracted location or empty string
 */
function extractLocationFromIncidentDetails(incidentDetails) {
  if (!incidentDetails || typeof incidentDetails !== 'string') {
    return '';
  }
  
  try {
    // Look for "LOCATION:" followed by location data
    const locationMatch = incidentDetails.match(/LOCATION:\\s*([^\\n\\r]+)/i);
    
    if (locationMatch && locationMatch[1]) {
      // Clean up the location text - remove extra whitespace and trim
      let location = locationMatch[1].trim();
      
      // Remove any trailing punctuation or common suffixes
      location = location.replace(/[.,;]+$/, '').trim();
      
      // If location is too short or just whitespace, return empty
      if (location.length < 3) {
        return '';
      }
      
      return location;
    }
    
    return '';
  } catch (error) {
    console.log(\`Location extraction failed for incident details: \${error.message}\`);
    return '';
  }
}
`;
        
        content = content.replace(insertAfter, match => match + locationFunction);
        modified = true;
        console.log(`✅ Added extractLocationFromIncidentDetails function to ${filePath}`);
      }
    }

    // 2. Update CALLS_HEADERS to include Location column if not present
    const headersPattern = /const CALLS_HEADERS = \[([^\]]+)\];/s;
    const headersMatch = content.match(headersPattern);
    if (headersMatch) {
      const headersContent = headersMatch[1];
      if (!headersContent.includes("'Location'")) {
        // Add Location after Incident Details
        const updatedHeaders = headersContent.replace(
          /'Incident Details',/,
          "'Incident Details', 'Location',"
        );
        content = content.replace(headersPattern, `const CALLS_HEADERS = [${updatedHeaders}];`);
        modified = true;
        console.log(`✅ Added Location to CALLS_HEADERS in ${filePath}`);
      }
    }

    // 3. Update header mappings to include Location
    const headerMappingExists = content.includes("'Location': 'location'");
    if (!headerMappingExists) {
      const headerMappingPattern = /'Incident Details': 'nature',/;
      if (headerMappingPattern.test(content)) {
        content = content.replace(
          /'Incident Details': 'nature',/,
          "'Incident Details': 'nature',\n    'Location': 'location',"
        );
        modified = true;
        console.log(`✅ Added Location to header mappings in ${filePath}`);
      }
    }

    // 4. Add location field to dataFields object
    const dataFieldsLocationExists = content.includes('location: extractLocationFromIncidentDetails');
    if (!dataFieldsLocationExists) {
      // Look for the pattern where nature field is defined in dataFields
      const dataFieldsPattern = /nature: stripHtmlTags\(callGetData\.Nature \|\| ''\),/;
      if (dataFieldsPattern.test(content)) {
        content = content.replace(
          dataFieldsPattern,
          "nature: stripHtmlTags(callGetData.Nature || ''), // Full incident details go here\n      location: extractLocationFromIncidentDetails(callGetData.Nature || ''), // Extract location from LOCATION: field"
        );
        modified = true;
        console.log(`✅ Added location field to dataFields in ${filePath}`);
      }
    }

    // Save the file if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Successfully updated ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 Adding Location column to all deployment packages...\n');

  let successCount = 0;
  let totalCount = 0;

  for (const filePath of filesToUpdate) {
    totalCount++;
    console.log(`\n📄 Processing: ${filePath}`);
    
    if (addLocationColumnToFile(filePath)) {
      successCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully updated: ${successCount} files`);
  console.log(`📄 Total processed: ${totalCount} files`);
  console.log(`\n🎉 Location column implementation complete!`);
}

if (require.main === module) {
  main();
}

module.exports = { addLocationColumnToFile };