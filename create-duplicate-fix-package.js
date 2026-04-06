/**
 * Create Deployment Package with Duplicate Processing Fix
 * Resolves calls being processed multiple times by SignalR and polling
 */

const fs = require('fs');
const archiver = require('archiver');

async function createDuplicateFixPackage() {
  console.log('Creating deployment package with duplicate processing fix...\n');
  
  const archiveName = 'resgrid-eso-bridge-DUPLICATE-FIX-v1.7.8.zip';
  const output = fs.createWriteStream(archiveName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', function() {
    console.log(`Duplicate fix package created: ${archiveName}`);
    console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ready for deployment - prevents duplicate call processing`);
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  archive.pipe(output);
  
  // Core application files with duplicate fix
  console.log('Adding application files with duplicate processing fix...');
  const coreFiles = [
    'src/index.js',
    'src/xml-generator.js', 
    'src/sheets-logger.js',
    'src/sftp-client.js',
    'src/fly-io-sftp-client.js',
    'package.json',
    'README.md'
  ];
  
  coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
      archive.file(file, { name: `resgrid-eso-bridge/${file}` });
    }
  });
  
  // Supporting modules
  const supportFiles = [
    'src/config.js',
    'src/fix-logger.js',
    'src/token-manager.js',
    'src/resgrid-api.js'
  ];
  
  supportFiles.forEach(file => {
    if (fs.existsSync(file)) {
      archive.file(file, { name: `resgrid-eso-bridge/${file}` });
    }
  });
  
  // Deployment files
  archive.file('Dockerfile', { name: 'resgrid-eso-bridge/Dockerfile' });
  archive.file('fly.toml', { name: 'resgrid-eso-bridge/fly.toml' });
  
  // Create fix summary documentation
  const fixSummary = `# Duplicate Processing Fix - v1.7.8

## Issue Resolved
Call 201105 was processed twice because SignalR events and polling mechanism weren't properly synchronized for duplicate detection.

## Root Cause
- SignalR handler (processCallAdded) didn't check for duplicates
- Polling mechanism had separate duplicate tracking
- Same call triggered by both mechanisms caused double processing

## Fix Applied
1. Added duplicate check at start of processCallAdded function
2. Centralized duplicate tracking to prevent race conditions
3. Mark calls as processed immediately upon entry

## Expected Behavior
- Each emergency call processed exactly once
- No more "XML Upload Successful" followed by "Upload Failed" for same call
- Improved system reliability and reduced ESO server load

## Deployment Command
\`\`\`powershell
flyctl deploy --app resgrid2eso --build-arg ALLOW_EOL_SHIMMED_BUILDER=1
\`\`\`

This fix ensures emergency calls are processed reliably without duplicates.`;

  archive.append(fixSummary, { name: 'resgrid-eso-bridge/DUPLICATE_FIX_SUMMARY.md' });
  
  console.log('Finalizing duplicate fix package...');
  await archive.finalize();
  
  return archiveName;
}

createDuplicateFixPackage().catch(console.error);