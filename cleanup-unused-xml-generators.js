/**
 * Cleanup Script for Unused XML Generator Files
 * Removes legacy XML generator variants from all deployment packages
 */

const fs = require('fs');
const path = require('path');

// Files to remove from deployment packages
const filesToRemove = [
  'src/xml-generator-updated.js',
  'src/xml-generator-exact-match.js',
  'src/xml-generator-pacific-time.js'
];

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

// Clean up unused XML generators
function cleanupXMLGenerators() {
  console.log('🧹 Cleaning up unused XML generator files...');
  
  const packages = findDeploymentPackages();
  let totalRemoved = 0;
  
  for (const packageDir of packages) {
    console.log(`\n📦 Processing ${packageDir}:`);
    
    for (const fileToRemove of filesToRemove) {
      const fullPath = path.join(packageDir, fileToRemove);
      
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`   ✅ Removed ${fileToRemove}`);
          totalRemoved++;
        } catch (error) {
          console.log(`   ❌ Failed to remove ${fileToRemove}: ${error.message}`);
        }
      } else {
        console.log(`   ⚪ ${fileToRemove} not found (already clean)`);
      }
    }
  }
  
  console.log(`\n📊 Summary: Removed ${totalRemoved} unused XML generator files`);
  console.log('✅ XML generator cleanup complete');
}

// Main execution
if (require.main === module) {
  cleanupXMLGenerators();
}

module.exports = { cleanupXMLGenerators };