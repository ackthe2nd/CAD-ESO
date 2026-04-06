/**
 * Create a deployment package for Resgrid-ESO Bridge
 * 
 * This script packages up all required files and creates a deployment-ready
 * tar.gz file with the latest XML field updates and status monitoring tools.
 */
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Configuration
const tarName = 'resgrid-eso-bridge-deployment-v1.4.4.tar.gz';
const packageDir = 'deployment-package';
const filesToInclude = [
  // Core application files
  'src/index.js',
  'src/config.js',
  'src/fix-logger.js',
  'src/resgrid-api.js',
  'src/sheets-logger.js',
  'src/token-manager.js',
  'src/utils/priority.js',
  'src/xml-generator.js',
  
  // Utility scripts
  'fetch-existing-calls.js',
  'export-calls-to-sheets.js',
  'export-calls-to-sheets-enhanced.js',  // New enhanced export tool with XML in column D
  'listener.js',
  'monitor-stn1-status-fixed.js',
  'confirm-stn1-status.js',
  'test-xml-changes.js',
  
  // Configuration files
  '.env.example',
  'package.json',
  'package-lock.json',
  
  // Documentation
  'README.md',
  'DEPLOYMENT.md',
  'UNIT_STATUS_GUIDE.md',
  'XML_FIELD_UPDATES.md',
  'STATUS_CODE_REFERENCE.md',
  'FIXED_API_ENDPOINTS_UPDATED.md',
  'Resgrid_ESO_Field_Mapping_Final.md',
  'SETTING_UP_GOOGLE_SHEETS_SECRET.md',
  'GOOGLE_SHEETS_INTEGRATION.md',
  'TOKEN_REFRESH.md',
  'FINGERPRINT_CACHING.md',
  'GOOGLE_SHEETS_EXPORT.md',
  'GOOGLE_SHEETS_EXPORT_GUIDE.md',
  'UNIT_TIMES_EXTRACTION.md',
  'VERSION_SUMMARY.md',
  'VERSION_SUMMARY_V1.4.3.md',
  'VERSION_SUMMARY_V1.4.4.md',
  'XML_FORMAT_UPDATES.md',
  'FIELD_MAPPING_REFERENCE.md',
  'Dockerfile',
  'fly.toml'
];

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  console.log(`Creating deployment package: ${tarName}`);
  
  // Create package directory if it doesn't exist
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir);
    console.log(`Created directory: ${packageDir}`);
  }
  
  // Create src subdirectory if it doesn't exist
  const srcDir = path.join(packageDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
    console.log(`Created directory: ${srcDir}`);
  }
  
  // Create src/utils subdirectory if it doesn't exist
  const utilsDir = path.join(srcDir, 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir);
    console.log(`Created directory: ${utilsDir}`);
  }
  
  // Copy all files to the package directory
  filesToInclude.forEach(file => {
    // Get source and destination paths
    const srcFile = path.resolve(file);
    const destFile = path.join(packageDir, file);
    
    // Ensure destination directory exists
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      console.log(`Created directory: ${destDir}`);
    }
    
    // Copy the file
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied: ${file}`);
    } else {
      console.error(`File not found: ${file}`);
    }
  });
  
  // Create the tar.gz file
  try {
    childProcess.execSync(`tar -czf ${tarName} ${packageDir}`, {
      stdio: 'inherit'
    });
    console.log(`\nDeployment package created: ${tarName}`);
  } catch (error) {
    console.error('Error creating tar.gz file:', error.message);
  }
}

// Create the deployment package
createDeploymentPackage();