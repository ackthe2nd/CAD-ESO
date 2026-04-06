/**
 * Create Deployment Package with Resgrid-Level Change Detection
 * Prevents unnecessary processing when call data hasn't changed
 */

const fs = require('fs');
const archiver = require('archiver');

async function createResgridChangeDetectionPackage() {
  console.log('Creating deployment package with Resgrid-level change detection...\n');
  
  const archiveName = 'resgrid-eso-bridge-RESGRID-CHANGE-DETECTION-v1.7.9.zip';
  const output = fs.createWriteStream(archiveName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', function() {
    console.log(`Resgrid change detection package created: ${archiveName}`);
    console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ready for deployment - eliminates unnecessary processing`);
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  archive.pipe(output);
  
  // Core application files with Resgrid change detection
  console.log('Adding application files with Resgrid-level change detection...');
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
  
  // Create change detection summary documentation
  const changeDetectionSummary = `# Resgrid-Level Change Detection - v1.7.9

## Issue Resolved
System was repeatedly processing the same calls even when no changes occurred, causing unnecessary:
- API calls to Resgrid
- XML generation and processing
- SFTP uploads to ESO
- Google Sheets logging

## Root Cause
Change detection was happening AFTER XML upload rather than BEFORE processing, at the wrong level (Google Sheets instead of Resgrid data).

## Solution Implemented
1. **Resgrid-Level Change Detection**: Compare current call data with previous snapshots before any processing
2. **Early Exit**: Skip XML generation, SFTP upload, and logging when no changes detected
3. **Comprehensive Field Monitoring**: Track all significant fields that matter for emergency services:
   - Call details (name, nature, address, notes)
   - Call state and timing information
   - Priority and response information
   - Location details (GPS, city, state, zip)
   - Unit assignments and their states
   - Patient information
   - Contact information
   - Unit status timestamps (en route, on scene, at patient, etc.)

## Memory Management
- Automatic cleanup of old call snapshots (24-hour retention)
- Prevents memory growth over time
- Maintains performance for long-running deployments

## Expected Behavior After Fix
- Each call processes only when meaningful changes occur
- No more repeated "XML Upload Successful" followed by "Upload Failed" for unchanged calls
- Reduced load on ESO SFTP server
- Faster response times
- Lower resource consumption

## Deployment Command
\`\`\`powershell
flyctl deploy --app resgrid2eso --build-arg ALLOW_EOL_SHIMMED_BUILDER=1
\`\`\`

This eliminates the root cause of unnecessary call reprocessing by implementing proper change detection at the source data level.`;

  archive.append(changeDetectionSummary, { name: 'resgrid-eso-bridge/RESGRID_CHANGE_DETECTION_SUMMARY.md' });
  
  console.log('Finalizing Resgrid change detection package...');
  await archive.finalize();
  
  return archiveName;
}

createResgridChangeDetectionPackage().catch(console.error);