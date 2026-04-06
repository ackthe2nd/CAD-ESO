/**
 * Fix XML Compliance Issues Across All Deployment Packages
 * 1. Fix namespace attribute syntax: xmlns_xsi -> xmlns:xsi
 * 2. Address empty XML elements for ESO compliance
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

// Fix XML compliance issues in xml-generator.js files
function fixXMLComplianceIssues() {
  console.log('🔧 Fixing XML compliance issues across all deployment packages...');
  
  const packages = findDeploymentPackages();
  let updatedFiles = 0;
  
  for (const packageDir of packages) {
    const xmlGeneratorPath = path.join(packageDir, 'src', 'xml-generator.js');
    
    if (fs.existsSync(xmlGeneratorPath)) {
      console.log(`\n📦 Processing ${packageDir}/src/xml-generator.js:`);
      
      try {
        let content = fs.readFileSync(xmlGeneratorPath, 'utf8');
        let changes = 0;
        
        // Fix 1: Namespace attribute syntax
        const namespacePattern = /xmlns_xsi=/g;
        if (content.includes('xmlns_xsi=')) {
          content = content.replace(namespacePattern, 'xmlns:xsi=');
          changes++;
          console.log('   ✅ Fixed XML namespace attribute syntax (xmlns_xsi -> xmlns:xsi)');
        }
        
        // Fix 2: Handle empty XML elements more gracefully
        // Replace empty elements with self-closing tags to reduce validator issues
        const emptyElementPatterns = [
          { pattern: /<UnitEnRoute><\/UnitEnRoute>/g, replacement: '<UnitEnRoute/>' },
          { pattern: /<UnitArrived><\/UnitArrived>/g, replacement: '<UnitArrived/>' },
          { pattern: /<UnitAtPatient><\/UnitAtPatient>/g, replacement: '<UnitAtPatient/>' },
          { pattern: /<UnitCleared><\/UnitCleared>/g, replacement: '<UnitCleared/>' },
          { pattern: /<UnitBackInService><\/UnitBackInService>/g, replacement: '<UnitBackInService/>' },
          { pattern: /<UnitTransport><\/UnitTransport>/g, replacement: '<UnitTransport/>' },
          { pattern: /<UnitAtHospital><\/UnitAtHospital>/g, replacement: '<UnitAtHospital/>' }
        ];
        
        for (const { pattern, replacement } of emptyElementPatterns) {
          if (content.match(pattern)) {
            content = content.replace(pattern, replacement);
            changes++;
          }
        }
        
        if (changes > 0) {
          fs.writeFileSync(xmlGeneratorPath, content);
          console.log(`   📝 Applied ${changes} XML compliance fixes`);
          updatedFiles++;
        } else {
          console.log('   ⚪ No XML compliance issues found (already compliant)');
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing ${packageDir}: ${error.message}`);
      }
    } else {
      console.log(`   ⚪ ${packageDir} - src/xml-generator.js not found`);
    }
  }
  
  console.log(`\n📊 Summary: Updated ${updatedFiles} deployment packages`);
  console.log('✅ XML compliance fixes complete');
}

// Main execution
if (require.main === module) {
  fixXMLComplianceIssues();
}

module.exports = { fixXMLComplianceIssues };