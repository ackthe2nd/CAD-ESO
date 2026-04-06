/**
 * Create Final Deployment Package - Resgrid Change Detection Complete
 */

const fs = require('fs');
const archiver = require('archiver');

async function createFinalChangeDetectionPackage() {
  console.log('Creating final deployment package with complete Resgrid-level change detection...\n');
  
  const archiveName = 'resgrid-eso-bridge-CHANGE-DETECTION-COMPLETE-v1.8.0.zip';
  const output = fs.createWriteStream(archiveName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', function() {
    console.log(`Final change detection package created: ${archiveName}`);
    console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ready for deployment - completely eliminates duplicate processing`);
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  archive.pipe(output);
  
  // Core application files with complete change detection
  console.log('Adding application files with complete Resgrid-level change detection...');
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
  
  // Create comprehensive change detection documentation
  const changeDetectionDocumentation = `# Complete Resgrid-Level Change Detection - v1.8.0

## Issue Completely Resolved
System was repeatedly processing calls 201104 and 201105 even when no emergency data had changed, causing:
- Unnecessary XML generation and SFTP uploads
- SFTP connection failures due to repeated attempts
- Resource waste and performance degradation
- Duplicate logging in Google Sheets

## Root Cause Identified and Fixed
Change detection was happening AFTER processing rather than BEFORE, at the wrong data level.

## Complete Solution Implemented

### 1. Resgrid-Level Change Detection
- **Snapshot Creation**: Comprehensive tracking of all significant emergency service fields
- **Early Comparison**: Compare current call data with stored snapshots BEFORE any processing
- **Smart Field Monitoring**: Tracks critical fields like call state, unit assignments, patient info, timestamps

### 2. Dual Path Implementation
- **SignalR Events**: New calls from real-time events use full change detection
- **Polling Mechanism**: Backup polling uses same change detection to prevent duplicate processing
- **Unified Logic**: Both paths use identical snapshot comparison logic

### 3. Memory Management
- **Automatic Cleanup**: Removes old snapshots after 24 hours
- **Size Monitoring**: Prevents memory growth during long deployments
- **Performance Optimization**: Maintains fast response times

### 4. Comprehensive Field Tracking
Monitors all emergency-critical fields:
- Call details (name, nature, address, notes)
- Call state and timing information  
- Priority and response information
- Location details (GPS coordinates, city, state, zip)
- Unit assignments and their status changes
- Patient information and demographics
- Contact information
- Unit operational timestamps (en route, on scene, at patient, cleared, back in service)

## Expected Behavior After Complete Fix
- ✅ Calls 201104 and 201105 process only when actual emergency data changes
- ✅ No more repeated XML uploads for unchanged calls
- ✅ Reduced SFTP connection load and failures
- ✅ Faster emergency response processing
- ✅ Lower resource consumption
- ✅ Accurate tracking in Google Sheets without duplicates

## Deployment Command
\`\`\`powershell
flyctl deploy --app resgrid2eso --build-arg ALLOW_EOL_SHIMMED_BUILDER=1
\`\`\`

## Verification
Look for these log messages confirming change detection is working:
- "No changes detected for call [ID] - skipping processing during polling"
- "Changes detected for call [ID] - proceeding with processing" 
- "First time processing call [ID] during polling - proceeding with processing"

This completely eliminates the root cause of duplicate call processing by implementing proper change detection at the emergency data source level.`;

  archive.append(changeDetectionDocumentation, { name: 'resgrid-eso-bridge/CHANGE_DETECTION_COMPLETE.md' });
  
  console.log('Finalizing complete change detection package...');
  await archive.finalize();
  
  return archiveName;
}

createFinalChangeDetectionPackage().catch(console.error);