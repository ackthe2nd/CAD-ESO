/**
 * Create a deployment package for Resgrid-ESO Bridge v1.6.0
 * 
 * This script packages up all required files and creates a deployment-ready
 * zip file with the latest multiple units support and XML enhancements.
 */

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const packageName = `resgrid-eso-bridge-v1.6.0-${timestamp}.zip`;
  
  // Create a file to stream archive data to
  const output = fs.createWriteStream(packageName);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });
  
  // Listen for all archive data to be written
  output.on('close', function() {
    console.log(`✓ Deployment package created: ${packageName}`);
    console.log(`✓ Total size: ${archive.pointer()} bytes`);
    console.log('\nPackage Contents:');
    console.log('- Core application files (src/, package.json, etc.)');
    console.log('- Multiple units XML support');
    console.log('- Enhanced unit timestamp processing');
    console.log('- Google Sheets integration');
    console.log('- XML consistency fixes');
    console.log('- Documentation and field mapping guides');
    console.log('- Test files and validation scripts');
    console.log('\nDeployment Instructions:');
    console.log('1. Extract the zip file to your target server');
    console.log('2. Run: npm install');
    console.log('3. Configure environment variables from .env.example');
    console.log('4. Test with: node test-multiple-units-xml.js');
    console.log('5. Start with: node listener.js');
  });
  
  // This event is fired when the data source is drained no matter what was the data source
  output.on('end', function() {
    console.log('Data has been drained');
  });
  
  // Good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });
  
  // Good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Core application files
  archive.file('package.json', { name: 'package.json' });
  archive.file('.env.example', { name: '.env.example' });
  archive.file('listener.js', { name: 'listener.js' });
  
  // Source files
  archive.directory('src/', 'src');
  
  // Documentation
  archive.file('README.md', { name: 'README.md' });
  archive.file('MULTIPLE_UNITS_FEATURE.md', { name: 'MULTIPLE_UNITS_FEATURE.md' });
  archive.file('VERSION_SUMMARY_V1.5.0.md', { name: 'VERSION_SUMMARY_V1.5.0.md' });
  archive.file('XML_CONSISTENCY_FIX.md', { name: 'XML_CONSISTENCY_FIX.md' });
  archive.file('GOOGLE_SHEETS_INTEGRATION.md', { name: 'GOOGLE_SHEETS_INTEGRATION.md' });
  archive.file('FIELD_MAPPING_REFERENCE.md', { name: 'FIELD_MAPPING_REFERENCE.md' });
  archive.file('RESGRID_API_REFERENCE.md', { name: 'RESGRID_API_REFERENCE.md' });
  archive.file('TOKEN_REFRESH.md', { name: 'TOKEN_REFRESH.md' });
  archive.file('UNIT_TIMES_EXTRACTION.md', { name: 'UNIT_TIMES_EXTRACTION.md' });
  
  // Test files
  archive.file('test-multiple-units-xml.js', { name: 'test-multiple-units-xml.js' });
  archive.file('fetch-and-log-active-calls.js', { name: 'fetch-and-log-active-calls.js' });
  archive.file('test-xml-upload-logging.js', { name: 'test-xml-upload-logging.js' });
  
  // Utility and analysis scripts
  archive.file('confirm-stn1-status.js', { name: 'confirm-stn1-status.js' });
  archive.file('export-calls-to-sheets.js', { name: 'export-calls-to-sheets.js' });
  
  // Field mapping files
  if (fs.existsSync('Resgrid_to_ESO_Field_Mapping_Final.xlsx')) {
    archive.file('Resgrid_to_ESO_Field_Mapping_Final.xlsx', { name: 'Resgrid_to_ESO_Field_Mapping_Final.xlsx' });
  }
  
  // Example XML files
  if (fs.existsSync('eso-complete-mapping-example.xml')) {
    archive.file('eso-complete-mapping-example.xml', { name: 'eso-complete-mapping-example.xml' });
  }
  
  // Example output
  if (fs.existsSync('example-output.xml')) {
    archive.file('example-output.xml', { name: 'example-output.xml' });
  }
  
  // Multiple units example
  if (fs.existsSync('attached_assets/Multiple Unit Examples.xml')) {
    archive.file('attached_assets/Multiple Unit Examples.xml', { name: 'examples/Multiple Unit Examples.xml' });
  }
  
  // Deployment instructions
  archive.file('DEPLOYMENT_SUMMARY_V1.5.0.md', { name: 'DEPLOYMENT_SUMMARY_V1.5.0.md' });
  
  // Finalize the archive (ie we are done appending files but streams have to finish yet)
  archive.finalize();
}

// Create version summary for v1.6.0
const versionSummary = `# Version Summary - v1.6.0

## New Features

### Multiple Units Support
- Automatic detection of calls with multiple units
- Nested XML structure for multiple units using \`<Units>\` wrapper
- Individual unit timestamps and information
- Backward compatibility maintained for single-unit calls

### Enhanced Unit Processing
- Improved unit extraction from Dispatches array
- Individual timestamp processing for each unit
- Better fallback handling for missing data

### XML Generation Improvements
- Dynamic XML structure based on unit count
- Proper unit-specific timestamp assignment
- Maintained field mapping consistency

## Technical Improvements

### Data Structure Handling
- Enhanced unit object creation and management
- Improved activity array processing for multiple units
- Better error handling for edge cases

### Testing
- Comprehensive test suite for multiple units functionality
- Validation for both single and multiple unit scenarios
- XML structure verification

## Files Changed

- \`src/xml-generator.js\`: Added multiple units support
- \`test-multiple-units-xml.js\`: New test file for validation
- \`MULTIPLE_UNITS_FEATURE.md\`: Feature documentation

## Deployment Notes

This version maintains full backward compatibility while adding support for multiple units per incident. No configuration changes required - the system automatically detects and handles multiple units appropriately.

## Version History

- v1.6.0: Multiple units support with nested XML structure
- v1.5.0: XML consistency fixes and GPS coordinate extraction  
- v1.4.9: Google Sheets integration improvements
- v1.4.8: Enhanced logging and error recovery
- v1.4.7: XML field updates and status monitoring`;

fs.writeFileSync('VERSION_SUMMARY_V1.6.0.md', versionSummary);

// Run the package creation
createDeploymentPackage();