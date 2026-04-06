/**
 * Fix ESO Upload Status Timestamp Format
 * Updates all deployment packages to use Pacific time format in ESO Upload Status
 */

const fs = require('fs');
const path = require('path');

// Find all deployment package directories
function findDeploymentPackages() {
  const packages = [];
  const files = fs.readdirSync('.');
  
  for (const file of files) {
    if (file.startsWith('deployment-package') && fs.statSync(file).isDirectory()) {
      packages.push(file);
    }
  }
  
  return packages;
}

// Fix ESO upload timestamp format in sheets-logger.js files
function fixESOUploadTimestampFormat() {
  console.log('🕐 Fixing ESO Upload Status timestamp format to Pacific time...');
  
  const packages = findDeploymentPackages();
  let updatedFiles = 0;
  
  for (const packageDir of packages) {
    const sheetsLoggerPath = path.join(packageDir, 'src', 'sheets-logger.js');
    
    if (fs.existsSync(sheetsLoggerPath)) {
      console.log(`\n📦 Processing ${packageDir}/src/sheets-logger.js:`);
      
      try {
        let content = fs.readFileSync(sheetsLoggerPath, 'utf8');
        
        // Fix the formatUploadStatus function to use Pacific time
        const oldPattern = /const timestamp = new Date\(\)\.toISOString\(\);/g;
        const newPattern = 'const timestamp = convertToPacificTime(new Date().toISOString());';
        
        if (content.includes('const timestamp = new Date().toISOString();')) {
          content = content.replace(oldPattern, newPattern);
          fs.writeFileSync(sheetsLoggerPath, content);
          console.log('   ✅ Updated ESO Upload Status timestamp format to Pacific time');
          updatedFiles++;
        } else if (content.includes('convertToPacificTime(new Date().toISOString())')) {
          console.log('   ⚪ Already using Pacific time format');
        } else {
          console.log('   ⚪ formatUploadStatus function not found or different format');
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing ${packageDir}: ${error.message}`);
      }
    } else {
      console.log(`   ⚪ ${packageDir} - src/sheets-logger.js not found`);
    }
  }
  
  console.log(`\n📊 Summary: Updated ${updatedFiles} deployment packages`);
  console.log('✅ ESO Upload Status timestamp format fix complete');
}

// Main execution
if (require.main === module) {
  fixESOUploadTimestampFormat();
}

module.exports = { fixESOUploadTimestampFormat };