/**
 * Update Location Extraction in All Deployment Packages
 * Applies the corrected regex pattern to all sheets-logger.js files
 */

const fs = require('fs');
const path = require('path');

// Updated extraction function
const updatedExtractionFunction = `    function extractLocationFromIncidentDetails(incidentDetails) {
      if (!incidentDetails || typeof incidentDetails !== 'string') {
        return '';
      }
      
      try {
        // Look for "LOCATION:" followed by location data
        // Stop at the next " - " followed by numbers (address) or " - ALERTS"
        const locationMatch = incidentDetails.match(/LOCATION:\\s*([^-\\n\\r]+?)(?:\\s*-\\s*(?:\\d|\\w+\\s+\\w+|\\w+,|\\w+\\s+\\w+\\s+\\w+|ALERTS))/i);
        
        if (locationMatch && locationMatch[1]) {
          let location = locationMatch[1].trim();
          location = location.replace(/[.,;:]+$/, '').trim();
          
          if (location.length < 3) {
            return '';
          }
          
          return location;
        }
        
        // Fallback: try simpler pattern if the complex one doesn't match
        const fallbackMatch = incidentDetails.match(/LOCATION:\\s*([^-\\n\\r]+?)(?:\\s*-|$)/i);
        if (fallbackMatch && fallbackMatch[1]) {
          let location = fallbackMatch[1].trim();
          
          // If this looks like an address (contains numbers), skip it
          if (/^\\d/.test(location)) {
            return '';
          }
          
          location = location.replace(/[.,;:]+$/, '').trim();
          
          if (location.length < 3) {
            return '';
          }
          
          return location;
        }
        
        return '';
      } catch (error) {
        logger.error(\`Error extracting location from incident details: \${error.message}\`);
        return '';
      }
    }`;

// Files to update
const filesToUpdate = [
  './deployment-package-v1.7.0/src/sheets-logger.js',
  './deployment-package-v1.7.2/src/sheets-logger.js', 
  './deployment-package-v1.8.0/src/sheets-logger.js',
  './deployment-package-v2.1.0/src/sheets-logger.js',
  './deployment-package-v2.1.1/src/sheets-logger.js',
  './deployment-package-v2.1.2/src/sheets-logger.js'
];

function updateLocationExtractionInFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find and replace the extractLocationFromIncidentDetails function
    const functionRegex = /function extractLocationFromIncidentDetails\(incidentDetails\)\s*\{[\s\S]*?\n\s{4}\}/g;
    
    if (content.match(functionRegex)) {
      content = content.replace(functionRegex, updatedExtractionFunction);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated successfully`);
      return true;
    } else {
      console.log(`  ⚠️  Function not found in expected format`);
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error updating file: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('='.repeat(70));
  console.log('UPDATING LOCATION EXTRACTION IN ALL DEPLOYMENT PACKAGES');
  console.log('='.repeat(70));
  
  let updatedCount = 0;
  let totalCount = 0;
  
  for (const filePath of filesToUpdate) {
    totalCount++;
    if (updateLocationExtractionInFile(filePath)) {
      updatedCount++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('UPDATE SUMMARY');
  console.log('='.repeat(70));
  console.log(`Files updated: ${updatedCount}/${totalCount}`);
  
  if (updatedCount === totalCount) {
    console.log('\n🎉 All deployment packages updated successfully!');
    console.log('Location extraction will now work consistently across all versions.');
  } else if (updatedCount > 0) {
    console.log('\n✅ Some deployment packages updated successfully.');
  } else {
    console.log('\n⚠️  No files were updated. Manual inspection may be needed.');
  }
}

main();