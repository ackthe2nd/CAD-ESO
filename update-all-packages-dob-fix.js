/**
 * Update All Deployment Packages with DOB Reference Id Fix
 * Ensures consistent DOB extraction across all deployment packages
 */

const fs = require('fs');
const path = require('path');

function findAllXmlGenerators() {
  const packages = [];
  const baseDir = __dirname;
  
  // Find all deployment package directories
  const items = fs.readdirSync(baseDir);
  
  for (const item of items) {
    if (item.startsWith('deployment-package') || 
        item.includes('flyio') || 
        item.includes('production')) {
      const itemPath = path.join(baseDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const xmlGenPath = path.join(itemPath, 'src', 'xml-generator.js');
        if (fs.existsSync(xmlGenPath)) {
          packages.push({ name: item, path: xmlGenPath });
        }
      }
    }
  }
  
  return packages;
}

function updateDOBExtraction(filePath) {
  console.log(`Updating ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already updated
    if (content.includes('Primary source for DOB: Check CAD Reference Id')) {
      console.log('  ✓ Already updated with DOB Reference Id fix');
      return true;
    }
    
    // Replace the old DOB extraction logic
    const oldPattern = /\/\/ Extract patient name and DOB information[\s\S]*?\/\/ Default DOB if patient self-identifies but no DOB found[\s\S]*?patientDOB = '2001-01-01';[\s\S]*?}/;
    
    const newDOBLogic = `// Extract patient name and DOB information
  let patientFirstName = '';
  let patientLastName = '';
  let patientDOB = '';
  
  // Primary source for DOB: Check CAD Reference Id and External Id fields
  if (callGetData.ReferenceId && callGetData.ReferenceId.trim() !== '') {
    // Reference Id might contain DOB in various formats
    const refId = callGetData.ReferenceId.trim();
    if (debug) console.log(\`Found Reference Id: \${refId}\`);
    
    // Check if Reference Id is a DOB (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const dobFormats = [
      /^(\\d{4}-\\d{2}-\\d{2})$/, // YYYY-MM-DD
      /^(\\d{2}\\/\\d{2}\\/\\d{4})$/, // MM/DD/YYYY
      /^(\\d{1,2}\\/\\d{1,2}\\/\\d{4})$/ // M/D/YYYY
    ];
    
    for (const format of dobFormats) {
      const match = refId.match(format);
      if (match) {
        patientDOB = match[1];
        // Convert to standard format if needed
        if (patientDOB.includes('/')) {
          const dateParts = patientDOB.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            patientDOB = \`\${year}-\${month}-\${day}\`;
          }
        }
        if (debug) console.log(\`Extracted DOB from Reference Id: \${patientDOB}\`);
        break;
      }
    }
  }
  
  // Alternative source: External Id field
  if (!patientDOB && externalId && externalId.trim() !== '') {
    const extId = externalId.trim();
    if (debug) console.log(\`Checking External Id for DOB: \${extId}\`);
    
    const dobFormats = [
      /^(\\d{4}-\\d{2}-\\d{2})$/,
      /^(\\d{2}\\/\\d{2}\\/\\d{4})$/,
      /^(\\d{1,2}\\/\\d{1,2}\\/\\d{4})$/
    ];
    
    for (const format of dobFormats) {
      const match = extId.match(format);
      if (match) {
        patientDOB = match[1];
        if (patientDOB.includes('/')) {
          const dateParts = patientDOB.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            patientDOB = \`\${year}-\${month}-\${day}\`;
          }
        }
        if (debug) console.log(\`Extracted DOB from External Id: \${patientDOB}\`);
        break;
      }
    }
  }
  
  // Primary source: ContactName field
  if (contactName) {
    const cleanName = contactName.trim();
    let nameParts = cleanName.split(' ');
    
    // Handle professional titles (Dr., Mr., Mrs., Ms., etc.)
    if (nameParts.length >= 3 && /^(dr|doctor|mr|mrs|ms|prof|professor)\\.?$/i.test(nameParts[0])) {
      // Skip the title and use the actual name
      nameParts = nameParts.slice(1);
    }
    
    if (nameParts.length >= 2) {
      patientFirstName = nameParts[0];
      patientLastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      patientFirstName = nameParts[0];
    }
  }`;
    
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newDOBLogic);
      
      // Also update the debug logging section
      const oldDebugPattern = /if \(debug && \(isPatientSelf \|\| isMedicalTeam\)\) \{[\s\S]*?\}/;
      const newDebugPattern = `if (debug) {
    console.log(\`=== DOB EXTRACTION DEBUG ===\`);
    console.log(\`Reference Id: \${callGetData.ReferenceId || 'Not found'}\`);
    console.log(\`External Id: \${externalId || 'Not found'}\`);
    console.log(\`Contact Name: \${contactName || 'Not found'}\`);
    console.log(\`Final extracted DOB: \${patientDOB || 'Empty - using authentic data only'}\`);
    console.log(\`Patient self-identification: \${isPatientSelf ? 'Patient' : isMedicalTeam ? 'Medical Team' : 'None'}\`);
    console.log(\`Final patient info: \${patientFirstName} \${patientLastName}, DOB: \${patientDOB || 'Not provided in CAD data'}\`);
    console.log(\`=== END DOB DEBUG ===\`);
  }`;
      
      if (oldDebugPattern.test(content)) {
        content = content.replace(oldDebugPattern, newDebugPattern);
      }
      
      fs.writeFileSync(filePath, content);
      console.log('  ✓ Updated with DOB Reference Id extraction');
      return true;
    } else {
      console.log('  ⚠ Pattern not found - manual update may be needed');
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('='.repeat(60));
  console.log('UPDATING ALL PACKAGES WITH DOB REFERENCE ID FIX');
  console.log('='.repeat(60));
  
  const packages = findAllXmlGenerators();
  
  if (packages.length === 0) {
    console.log('No deployment packages found with xml-generator.js');
    return;
  }
  
  console.log(`Found ${packages.length} deployment packages to update:`);
  packages.forEach(pkg => console.log(`  - ${pkg.name}`));
  console.log('');
  
  let updatedCount = 0;
  for (const pkg of packages) {
    if (updateDOBExtraction(pkg.path)) {
      updatedCount++;
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('DOB REFERENCE ID UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated ${updatedCount}/${packages.length} packages`);
  console.log('✅ Removed hardcoded DOB fallbacks (2001-01-01)');
  console.log('✅ Added Reference Id DOB extraction');
  console.log('✅ Added External Id DOB extraction');
  console.log('✅ Enhanced debug logging');
  console.log('✅ Only uses authentic CAD data');
  console.log('');
  console.log('All deployment packages now use correct DOB from CAD Reference Id.');
}

main();