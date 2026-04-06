/**
 * Script to create an update package for local installations
 * This will include only the necessary files to fix the recent issues
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create an update directory
const updateDir = path.join(__dirname, 'update-package');
if (fs.existsSync(updateDir)) {
  fs.rmSync(updateDir, { recursive: true, force: true });
}

fs.mkdirSync(updateDir);
fs.mkdirSync(path.join(updateDir, 'src'));
fs.mkdirSync(path.join(updateDir, 'src', 'utils'), { recursive: true });

// List of files to include in the update
const filesToInclude = [
  // Core API files with fixes
  'src/resgrid-api.js',
  
  // New export utilities
  'export-calls-to-sheets.js',
  'export-calls-to-sheets.ps1',
  
  // Documentation for the new features
  'GOOGLE_SHEETS_EXPORT.md',
  'DEPLOYING_TO_FLY_IO.md',
  
  // Test script
  'test-direct-sheets-export.js'
];

// Copy the files
for (const file of filesToInclude) {
  try {
    // Ensure directories exist
    const targetDir = path.dirname(path.join(updateDir, file));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(file, path.join(updateDir, file));
    console.log(`Copied: ${file}`);
  } catch (error) {
    console.error(`Error copying ${file}: ${error.message}`);
  }
}

// Create a README file with installation instructions
const readmeContent = `# Resgrid to ESO Bridge - Update Package

This package contains updated files to fix the issue with fetching recent calls and adds new Google Sheets export functionality.

## Installation Instructions

1. Extract all files from this package into your Resgrid to ESO Bridge installation directory
   (This will overwrite some existing files with updated versions)

2. The following files will be added or updated:
   - src/resgrid-api.js - Fixed to handle API endpoint changes
   - export-calls-to-sheets.js - New utility to export calls directly to Google Sheets
   - export-calls-to-sheets.ps1 - PowerShell script for remote export via Fly.io
   - GOOGLE_SHEETS_EXPORT.md - Documentation for the new export feature
   - DEPLOYING_TO_FLY_IO.md - Detailed deployment guide for Fly.io
   - test-direct-sheets-export.js - Test script for the new feature

## After Installation

You can now use the fixed scripts:

\`\`\`bash
# Fetch and process recent calls (now fixed)
node fetch-existing-calls.js --days=7

# Export calls directly to Google Sheets
node export-calls-to-sheets.js --days=7
node export-calls-to-sheets.js --active
\`\`\`

If your deployment is on Fly.io, you can also use:

\`\`\`powershell
# Export from Fly.io deployment
./export-calls-to-sheets.ps1 -Days 7
./export-calls-to-sheets.ps1 -Active
\`\`\`

See GOOGLE_SHEETS_EXPORT.md for complete documentation.
`;

fs.writeFileSync(path.join(updateDir, 'README.md'), readmeContent);
console.log('Created README.md with installation instructions');

// Create a tar.gz file for easy downloading
try {
  console.log('\nCreating compressed archive for download...');
  const archiveName = 'resgrid-eso-bridge-update.tar.gz';
  execSync(`cd ${updateDir} && tar -czf ../${archiveName} *`, { stdio: 'inherit' });
  console.log(`Archive created successfully: ${archiveName}`);
} catch (error) {
  console.error(`Error creating archive: ${error.message}`);
}

console.log('\nUpdate package is ready for download');