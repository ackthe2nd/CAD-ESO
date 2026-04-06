/**
 * Rebuild deployment package with the latest changes
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of files to include in the deployment package
const CORE_FILES = [
  // Core application
  'src',
  'node_modules',
  'package.json',
  'package-lock.json',
  'listener.js',
  '.env.example',
  
  // Configuration and utilities
  'final-with-sheets-fix.js',
  'fetch-existing-calls.js',
  'fixed-fetch-existing-calls.js',
  
  // Documentation
  'README.md',
  'DEPLOYMENT.md',
  'DEPLOYMENT_INSTRUCTIONS.md',
  'DEPLOYMENT_SUMMARY_V1.4.0.md',
  'TOKEN_OPTIMIZATION.md',
  'UNIT_TIMES.md',
  'UNIT_TIMES_EXTRACTION.md',
  'VERSION_SUMMARY.md',
  'STATUS_CODE_REFERENCE.md',
  'FIELD_MAPPING_REFERENCE.md',
  'GOOGLE_SHEETS_INTEGRATION.md',
  'SETTING_UP_GOOGLE_SHEETS_SECRET.md',
  'FINGERPRINT_CACHING.md',
  'UPDATED_FEATURES.md',
  'FIXED_API_ENDPOINTS.md',
  'FINAL_INSTRUCTIONS.md',
];

// Create deployment directories if they don't exist
const DEPLOYMENT_DIR = 'deployment-package';
if (!fs.existsSync(DEPLOYMENT_DIR)) {
  fs.mkdirSync(DEPLOYMENT_DIR);
}

// Version for the tarball
const VERSION = '1.4.1';
const TARBALL_NAME = `resgrid-eso-bridge-deployment-v${VERSION}.tar.gz`;

// Log function
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Copy a file or directory recursively
function copyFileOrDir(src, dst) {
  if (fs.lstatSync(src).isDirectory()) {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const dstPath = path.join(dst, file);
      copyFileOrDir(srcPath, dstPath);
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

// Main function
function main() {
  log(`Starting deployment package rebuild for version ${VERSION}...`);
  
  // Clean deployment directory
  const deploymentFiles = fs.readdirSync(DEPLOYMENT_DIR);
  for (const file of deploymentFiles) {
    const filePath = path.join(DEPLOYMENT_DIR, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
  
  log(`Cleared ${deploymentFiles.length} files/directories from deployment directory`);
  
  // Copy core files
  for (const file of CORE_FILES) {
    if (fs.existsSync(file)) {
      const destPath = path.join(DEPLOYMENT_DIR, file);
      copyFileOrDir(file, destPath);
      log(`Copied ${file} to deployment directory`);
    } else {
      log(`Warning: ${file} does not exist, skipping`);
    }
  }
  
  // Create tarball
  log(`Creating tarball: ${TARBALL_NAME}...`);
  execSync(`tar -czf ${TARBALL_NAME} -C ${DEPLOYMENT_DIR} .`);
  
  // Verify tarball creation
  if (fs.existsSync(TARBALL_NAME)) {
    const stats = fs.statSync(TARBALL_NAME);
    log(`Successfully created ${TARBALL_NAME} (${Math.round(stats.size / 1024)} KB)`);
  } else {
    log(`Error: Failed to create ${TARBALL_NAME}`);
  }
  
  log('Deployment package rebuild complete');
}

// Run the main function
main();