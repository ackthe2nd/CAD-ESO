/**
 * Add City Column to All Deployment Packages
 * Ensures consistent City column implementation across all sheets-logger.js files
 */

const fs = require('fs');
const path = require('path');

function addCityColumnToFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Update CALLS_HEADERS array to include City
    const headersPattern = /const CALLS_HEADERS = \[\s*([^]+?)\s*\];/;
    const headersMatch = content.match(headersPattern);
    
    if (headersMatch) {
      const currentHeaders = headersMatch[1];
      
      // Check if City is already included
      if (!currentHeaders.includes("'City'")) {
        console.log(`Adding City to CALLS_HEADERS in ${filePath}`);
        
        // Replace the headers to include City after Address Line 2
        const updatedHeaders = currentHeaders.replace(
          /'Address Line 2',(\s*)'State'/,
          "'Address Line 2',$1'City',$1'State'"
        );
        
        content = content.replace(headersPattern, `const CALLS_HEADERS = [\n  ${updatedHeaders}\n];`);
        modified = true;
      }
    }
    
    // Update headerMappings object to include City
    const mappingPattern = /const headerMappings = \{([^}]+)\}/;
    const mappingMatch = content.match(mappingPattern);
    
    if (mappingMatch) {
      const currentMappings = mappingMatch[1];
      
      // Check if City mapping is already included
      if (!currentMappings.includes("'City': 'city'")) {
        console.log(`Adding City mapping to headerMappings in ${filePath}`);
        
        // Add City mapping after Address Line 2
        const updatedMappings = currentMappings.replace(
          /'Address Line 2': 'addressLine2',(\s*)'State': 'state'/,
          "'Address Line 2': 'addressLine2',$1'City': 'city',$1'State': 'state'"
        );
        
        content = content.replace(mappingPattern, `const headerMappings = {${updatedMappings}}`);
        modified = true;
      }
    }
    
    // Save the file if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
      return true;
    } else {
      console.log(`No changes needed: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('Adding City column to all deployment packages...');
  
  // List of all sheets-logger.js files to update
  const filesToUpdate = [
    'src/sheets-logger.js',
    'deployment-package/src/sheets-logger.js',
    'deployment-package-v1.7.0/src/sheets-logger.js',
    'deployment-package-v1.7.0/sheets-logger.js',
    'deployment-package-v1.7.2/src/sheets-logger.js',
    'deployment-package-v1.8.0/src/sheets-logger.js',
    'deployment-package-v2.1.0/src/sheets-logger.js',
    'deployment-package-v2.1.1/src/sheets-logger.js',
    'deployment-package-v2.1.2/src/sheets-logger.js',
    'update-package/sheets-logger.js',
    'final-deployment/src/sheets-logger.js',
    'final-deployment-v1.7.1/src/sheets-logger.js'
  ];
  
  let successCount = 0;
  let totalCount = 0;
  
  filesToUpdate.forEach(filePath => {
    totalCount++;
    if (addCityColumnToFile(filePath)) {
      successCount++;
    }
  });
  
  console.log(`\nProcessed ${totalCount} files, ${successCount} successful`);
  console.log('City column integration complete!');
}

// Run the script
main();