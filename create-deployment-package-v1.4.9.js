/**
 * Create a deployment package for Resgrid-ESO Bridge v1.4.9
 * 
 * This script packages up all required files and creates a deployment-ready
 * zip file with the latest Google Sheets integration fixes for nested data structure.
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Define the version
const VERSION = '1.4.9';
const PACKAGE_NAME = `resgrid-eso-bridge-v${VERSION}.zip`;

// Define essential files to include
const ESSENTIAL_FILES = [
  // Core files
  'listener.js',
  'src/index.js',
  'src/logger.js',
  'src/resgrid-api.js',
  'src/sftp-client.js',
  'src/signalr-client.js',
  'src/token-manager.js',
  'src/xml-generator.js',
  'src/sheets-logger.js',  // Updated with nested data structure support
  
  // Environment files
  '.env.example',
  
  // Documentation files
  'README.md',
  'VERSION_SUMMARY_V1.4.9.md',
  'GOOGLE_SHEETS_NESTED_DATA_FIX.md',  // New documentation
  'FIELD_MAPPING_REFERENCE.md',        // Updated documentation
  
  // Helper files
  'check-direct-unit-status.js',
  'fetch-existing-calls.js',
  'check-unit-status-direct.js',
  'check-stn1-status-once.js',
  'check-updated-call-status.js',
  'export-calls-to-sheets.js',
  'confirm-stn1-status.js',
  
  // Essential folders
  'logs',
];

// Define folders to include entirely
const INCLUDE_FOLDERS = [
  'src',
  'logs',
];

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'deployment-package');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create logs directory in package if it doesn't exist
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Set up the archive and output stream
  const output = fs.createWriteStream(path.join(outputDir, PACKAGE_NAME));
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Set up event handlers
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`Deployment package created: ${PACKAGE_NAME} (${sizeInMB} MB)`);
    console.log(`Location: ${path.join(outputDir, PACKAGE_NAME)}`);
    console.log('\nDeployment package includes:');
    console.log(' - Updated sheets-logger.js with nested data structure support');
    console.log(' - New documentation file GOOGLE_SHEETS_NESTED_DATA_FIX.md');
    console.log(' - Updated FIELD_MAPPING_REFERENCE.md');
    console.log(' - VERSION_SUMMARY_V1.4.9.md');
  });
  
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Pipe the archive to the output file
  archive.pipe(output);
  
  // Add individual files
  ESSENTIAL_FILES.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
      archive.file(filePath, { name: file });
      console.log(`Added file: ${file}`);
    } else if (!INCLUDE_FOLDERS.some(folder => file.startsWith(folder))) {
      console.warn(`Warning: Essential file not found: ${file}`);
    }
  });
  
  // Add entire folders
  INCLUDE_FOLDERS.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
      archive.directory(folderPath, folder);
      console.log(`Added folder: ${folder}`);
    } else {
      console.warn(`Warning: Folder not found: ${folder}`);
    }
  });
  
  // Create a README for the deployment
  const readmeContent = `# Resgrid-ESO Bridge v${VERSION} Deployment Package

This package contains the Resgrid-ESO Bridge application with the following enhancements:

## Key Updates in v${VERSION}

- Fixed Google Sheets integration to support nested data structure in API responses
- Enhanced unit name extraction from Activity array and dispatch notes
- Improved extraction of status timestamps from various sources
- Added detailed documentation about the nested data structure

## Installation

1. Extract all files to your deployment directory
2. Copy \`.env.example\` to \`.env\` and configure your environment variables
3. Install dependencies with \`npm install\`
4. Start the bridge with \`node listener.js\`

See VERSION_SUMMARY_V${VERSION}.md for complete release notes.

Created: ${new Date().toISOString()}
`;
  
  archive.append(readmeContent, { name: 'DEPLOYMENT_README.md' });
  console.log('Added file: DEPLOYMENT_README.md');
  
  // Finalize the archive
  archive.finalize();
}

// Execute the function
createDeploymentPackage();