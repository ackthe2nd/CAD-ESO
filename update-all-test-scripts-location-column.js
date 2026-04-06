/**
 * Update All Test Scripts to Include Location Column
 * Ensures all Google Sheets test scripts extract and include Location data
 */

const fs = require('fs');
const path = require('path');

// Add location extraction function to test scripts
const locationExtractionFunction = `
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
    const locationMatch = incidentDetails.match(/LOCATION:\\s*([^\\n\\r]+)/i);
    
    if (locationMatch && locationMatch[1]) {
      let location = locationMatch[1].trim();
      location = location.replace(/[.,;]+$/, '').trim();
      
      if (location.length < 3) {
        return '';
      }
      
      return location;
    }
    
    return '';
  } catch (error) {
    console.log(\`Location extraction failed: \${error.message}\`);
    return '';
  }
}`;

// Test scripts that need Location column support
const testScripts = [
  'find-single-unit-call.js',
  'complete-real-data-test.js', 
  'test-real-calls-export-sheets.js',
  'test-and-export-call-200893.js',
  'export-test-results-to-sheets.js',
  'log-call-200576-test.js'
];

function updateTestScript(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Add location extraction function if not present
    if (!content.includes('extractLocationFromIncidentDetails')) {
      // Add function after require statements
      const requirePattern = /(require\('[^']+'\);?\s*\n)+/;
      if (requirePattern.test(content)) {
        content = content.replace(requirePattern, match => match + locationExtractionFunction + '\n');
        modified = true;
        console.log(`✅ Added location extraction function to ${filePath}`);
      }
    }

    // 2. Update test result objects to include location field
    const testResultPatterns = [
      // Pattern for objects being built with individual properties
      /(\s+nature:\s*[^,]+,)\s*(\s+note:)/g,
      // Pattern for objects with nature field
      /(\s+result\.nature[^,]*,)(\s+result\.note)/g
    ];

    testResultPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match, beforeNote, afterNote) => {
          if (!match.includes('location:')) {
            return beforeNote + '\n    location: extractLocationFromIncidentDetails(data.Nature || \'\'),' + afterNote;
          }
          return match;
        });
        modified = true;
      }
    });

    // 3. Update sheetData arrays to include location column
    const sheetDataPattern = /const sheetData = testResults\.map\(result => \[\s*([^\]]+)\s*\]\);/s;
    if (sheetDataPattern.test(content)) {
      content = content.replace(sheetDataPattern, (match, columns) => {
        if (!columns.includes('result.location')) {
          // Add location after address/zip fields
          const newColumns = columns.replace(
            /(result\.zip[^,]*,)/,
            '$1\n    result.location || \'\','
          );
          modified = true;
          return match.replace(columns, newColumns);
        }
        return match;
      });
    }

    // 4. Update extractCallDataForSheets functions to include location
    const extractCallDataPattern = /function extractCallDataForSheets\([^}]+\}/s;
    if (extractCallDataPattern.test(content)) {
      content = content.replace(extractCallDataPattern, (match) => {
        if (!match.includes('location:')) {
          const updatedFunction = match.replace(
            /(zip:\s*[^,]+,)/,
            '$1\n    location: extractLocationFromIncidentDetails(data.Nature || \'\'),'
          );
          modified = true;
          return updatedFunction;
        }
        return match;
      });
    }

    // 5. Update direct array mapping for Google Sheets data
    const directArrayPattern = /(\[\s*new Date\(\)\.toISOString\(\)[^}]+zip[^,]*,)([^}]+\])/s;
    if (directArrayPattern.test(content)) {
      content = content.replace(directArrayPattern, (match, beforeLocation, afterLocation) => {
        if (!match.includes('extractLocationFromIncidentDetails') && !match.includes('result.location')) {
          return beforeLocation + '\n    extractLocationFromIncidentDetails(data.Nature || callData.Nature || \'\'),' + afterLocation;
        }
        return match;
      });
      modified = true;
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

function updateSpecificTestScript(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Specific updates for find-single-unit-call.js
    if (filePath.includes('find-single-unit-call.js')) {
      // Add location to test result objects
      if (content.includes('patientDOB: callData.ExternalId') && !content.includes('location:')) {
        content = content.replace(
          /(patientDOB: callData\.ExternalId[^,]*,)/g,
          '$1\n        location: extractLocationFromIncidentDetails(callData.Nature || \'\'),'
        );
        modified = true;
      }

      // Update exportToSheets function to include location in the data array
      if (content.includes('result.patientDOB,') && !content.includes('result.location')) {
        content = content.replace(
          /(result\.patientDOB,)/,
          '$1\n    result.location || \'\','
        );
        modified = true;
      }
    }

    // Specific updates for complete-real-data-test.js
    if (filePath.includes('complete-real-data-test.js')) {
      // Add location to extractCallDataForSheets function return object
      if (content.includes('patientDOB: data.ExternalId') && !content.includes('location:')) {
        content = content.replace(
          /(patientDOB: data\.ExternalId[^,]*)/,
          '$1,\n    location: extractLocationFromIncidentDetails(data.Nature || \'\')'
        );
        modified = true;
      }
    }

    // Add location extraction function if not present
    if (!content.includes('extractLocationFromIncidentDetails')) {
      const insertPoint = content.indexOf('require(');
      if (insertPoint !== -1) {
        const afterRequires = content.indexOf('\n\n', insertPoint);
        if (afterRequires !== -1) {
          content = content.slice(0, afterRequires) + locationExtractionFunction + content.slice(afterRequires);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Successfully updated ${filePath} with specific changes`);
      return true;
    } else {
      console.log(`ℹ️  No specific changes needed for ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 Updating all test scripts to include Location column...\n');

  let successCount = 0;
  let totalCount = 0;

  for (const scriptFile of testScripts) {
    totalCount++;
    console.log(`\n📄 Processing: ${scriptFile}`);
    
    if (updateSpecificTestScript(scriptFile)) {
      successCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully updated: ${successCount} files`);
  console.log(`📄 Total processed: ${totalCount} files`);
  console.log(`\n🎉 Test script Location column updates complete!`);
  
  console.log(`\n📝 Test scripts now include:`);
  console.log(`   - extractLocationFromIncidentDetails() function`);
  console.log(`   - Location field in test result objects`);
  console.log(`   - Location column in Google Sheets exports`);
}

if (require.main === module) {
  main();
}

module.exports = { updateTestScript, updateSpecificTestScript };