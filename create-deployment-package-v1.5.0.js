/**
 * Create a deployment package for Resgrid-ESO Bridge v1.5.0
 * 
 * This script packages up all required files and creates a deployment-ready
 * zip file with the XML consistency fixes and enhanced GPS coordinate extraction.
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  console.log('Creating deployment package for Resgrid-ESO Bridge v1.5.0...');
  
  // Create the deployment-package directory if it doesn't exist
  if (!fs.existsSync('deployment-package')) {
    fs.mkdirSync('deployment-package', { recursive: true });
  }
  
  // Create a file to stream archive data to
  const outputPath = path.join('deployment-package', 'resgrid-eso-bridge-v1.5.0.zip');
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Listen for all archive data to be written
  output.on('close', function() {
    console.log(`✅ Deployment package created successfully: ${outputPath}`);
    console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    
    // Create a checksum for verification
    try {
      const checksum = execSync(`sha256sum ${outputPath}`).toString().split(' ')[0];
      console.log(`🔐 SHA-256 Checksum: ${checksum}`);
      fs.writeFileSync(
        path.join('deployment-package', 'checksum-v1.5.0.txt'), 
        `SHA-256: ${checksum}\nFilename: resgrid-eso-bridge-v1.5.0.zip\nVersion: 1.5.0\nCreated: ${new Date().toISOString()}\n`
      );
    } catch (error) {
      console.log('Could not generate checksum (non-critical)');
    }
  });
  
  // Pipe the archive data to the file
  archive.pipe(output);
  
  // Core application files
  const coreFiles = [
    { source: 'src/index.js', destination: 'src/index.js' },
    { source: 'src/xml-generator.js', destination: 'src/xml-generator.js' },
    { source: 'src/sheets-logger.js', destination: 'src/sheets-logger.js' },
    { source: 'src/logger.js', destination: 'src/logger.js' },
    { source: 'src/token-manager.js', destination: 'src/token-manager.js' },
    { source: 'src/resgrid-api.js', destination: 'src/resgrid-api.js' },
    { source: 'src/sftp-client.js', destination: 'src/sftp-client.js' },
    { source: 'package.json', destination: 'package.json' },
    { source: '.env.example', destination: '.env.example' },
    { source: 'README.md', destination: 'README.md' },
    { source: 'Dockerfile', destination: 'Dockerfile' },
    { source: '.dockerignore', destination: '.dockerignore' },
    { source: 'fly.toml', destination: 'fly.toml' },
    { source: 'VERSION_SUMMARY_V1.5.0.md', destination: 'VERSION_SUMMARY_V1.5.0.md' },
    { source: 'XML_CONSISTENCY_FIX.md', destination: 'XML_CONSISTENCY_FIX.md' },
    { source: 'FIELD_MAPPING_REFERENCE.md', destination: 'FIELD_MAPPING_REFERENCE.md' },
    { source: 'UNIT_STATUS_GUIDE.md', destination: 'UNIT_STATUS_GUIDE.md' },
    { source: 'GOOGLE_SHEETS_EXPORT.md', destination: 'GOOGLE_SHEETS_EXPORT.md' },
    { source: 'DEPLOYING_TO_FLY_IO.md', destination: 'DEPLOYING_TO_FLY_IO.md' }
  ];
  
  // Add each file to the archive
  coreFiles.forEach(file => {
    if (fs.existsSync(file.source)) {
      archive.file(file.source, { name: file.destination });
      console.log(`📄 Added ${file.source} to package`);
    } else {
      console.log(`⚠️ Warning: ${file.source} does not exist, skipping`);
    }
  });
  
  // Add the tools directory
  if (fs.existsSync('tools')) {
    archive.directory('tools', 'tools');
    console.log('📁 Added tools directory to package');
  }
  
  // Create a README specifically for this version
  const versionReadme = `# Resgrid to ESO Bridge v1.5.0
  
This package contains the Resgrid to ESO Bridge application, version 1.5.0.

## What's New in This Version

This update focuses on ensuring consistent XML generation across all parts of the system:

- Enhanced GPS coordinate extraction from unit activity data
- Fixed issues with key timestamp fields sometimes being empty
- Improved handling of nested data structures in API responses
- Fixed discrepancies between XML saved to logs and XML uploaded to SFTP

For complete details, see VERSION_SUMMARY_V1.5.0.md in this package.

## Installation

1. Extract all files from this zip package
2. Copy your existing .env file or create a new one using .env.example as a template
3. Install dependencies with \`npm install\`
4. Start the application with \`node src/index.js\`

## Deployment

For deployment to Fly.io, follow the instructions in DEPLOYING_TO_FLY_IO.md.

## Documentation

- FIELD_MAPPING_REFERENCE.md - Details about field mappings from Resgrid to ESO
- UNIT_STATUS_GUIDE.md - Information about unit status codes and handling
- GOOGLE_SHEETS_EXPORT.md - Guide for setting up and using Google Sheets integration
- XML_CONSISTENCY_FIX.md - Technical details about the XML consistency fixes

## Support

For support, please contact the development team.

## Version History

- v1.5.0 - XML Consistency Fixes
- v1.4.9 - Google Sheets Nested Data Structure Fixes
- v1.4.8 - Google Sheets Integration Fixes
- v1.4.7 - Enhanced Logging Features
- v1.4.6 - XML Field Updates
- v1.4.5 - Token Refresh Optimization
- v1.4.4 - API Endpoint Fixes
- v1.4.3 - SFTP Upload Enhancements
- v1.4.2 - Call Data Processing Improvements
- v1.4.1 - SignalR Connection Stability
- v1.4.0 - Initial Release with Google Sheets Integration
`;
  
  archive.append(versionReadme, { name: 'VERSION_README.md' });
  console.log('📄 Created and added VERSION_README.md to package');
  
  // Finalize the archive
  archive.finalize();
}

// Execute the package creation
createDeploymentPackage();