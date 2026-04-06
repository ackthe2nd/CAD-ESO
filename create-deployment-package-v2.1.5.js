/**
 * Create Deployment Package v2.1.5 - Call Closure Fix
 * Packages the fixed call closure detection system for Fly.io deployment
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createDeploymentPackage() {
  console.log('CREATING DEPLOYMENT PACKAGE V2.1.5 - CALL CLOSURE FIX');
  console.log('='.repeat(55));
  
  const packageDir = 'deployment-package-v2.1.5-call-closure-fix';
  const packagePath = path.join(process.cwd(), packageDir);
  
  // Create package directory
  if (fs.existsSync(packagePath)) {
    fs.rmSync(packagePath, { recursive: true, force: true });
  }
  fs.mkdirSync(packagePath, { recursive: true });
  
  // Copy core files
  const filesToCopy = [
    'package.json',
    'Dockerfile',
    '.dockerignore',
    'fly.toml'
  ];
  
  console.log('Copying core files...');
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(packagePath, file));
      console.log(`✓ ${file}`);
    }
  });
  
  // Copy src directory with fixed call closure detection
  const srcDir = path.join(packagePath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  
  const srcFiles = [
    'index.js',
    'sheets-logger.js', // Contains the fixed call closure logic
    'xml-generator.js',
    'token-manager.js',
    'fix-logger.js'
  ];
  
  console.log('Copying source files with call closure fixes...');
  srcFiles.forEach(file => {
    const srcFile = path.join('src', file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(srcDir, file));
      console.log(`✓ src/${file}`);
    }
  });
  
  // Create deployment documentation
  const deploymentDoc = `# Deployment Package v2.1.5 - Call Closure Fix

## What's Fixed in This Version

### Call Closure Detection System
- **Fixed State Detection**: Corrected logic to detect State === 1 for closed calls
- **Fixed Call Closed Field**: Now displays actual closure timestamps instead of Yes/No
- **Enhanced Closure Time Extraction**: Improved logic to capture closure times from multiple sources
- **Google Sheets Integration**: Proper timestamp formatting for closure data

### Key Changes
1. **sheets-logger.js**: 
   - Fixed extractClosedTime() function to properly detect State === 1
   - Updated callClosed field to show actual timestamps
   - Improved closure time extraction from unit activities and call data

2. **Real-time Detection**:
   - SignalR CallClosed event handler active
   - Immediate Google Sheets updates when calls are closed
   - Proper Pacific Time formatting for all timestamps

## Deployment Instructions

### Option 1: Fly.io CLI Deployment
\`\`\`bash
# Extract package
tar -xzf deployment-package-v2.1.5-call-closure-fix.tar.gz
cd deployment-package-v2.1.5-call-closure-fix

# Deploy to Fly.io
flyctl deploy --app resgrid2eso

# Verify deployment
flyctl status --app resgrid2eso
flyctl logs --app resgrid2eso
\`\`\`

### Option 2: Docker Deployment
\`\`\`bash
# Build and deploy via Docker
docker build -t resgrid-eso-bridge .
docker tag resgrid-eso-bridge registry.fly.io/resgrid2eso:latest
docker push registry.fly.io/resgrid2eso:latest

# Scale up on Fly.io
flyctl scale count 1 --app resgrid2eso
\`\`\`

## Environment Variables Required
- RESGRID_USER
- RESGRID_PASS  
- GOOGLE_SERVICE_ACCOUNT_JSON
- LOG_SHEET_ID

## Verification Steps
1. Check system logs for "Service started successfully"
2. Verify SignalR connection: "Connected to Resgrid SignalR hub"
3. Close a test call in Resgrid
4. Confirm Google Sheets "Call Closed" field shows timestamp
5. Verify XML upload to ESO SFTP

## Post-Deployment Testing
- Close call 201576 or create a new test call
- System should immediately detect closure via SignalR
- Google Sheets "Call Closed" field should populate with Pacific Time timestamp
- Final XML should upload to ESO with closure data

Generated: ${new Date().toISOString()}
Version: 2.1.5 - Call Closure Fix
`;

  fs.writeFileSync(path.join(packagePath, 'DEPLOYMENT_GUIDE_v2.1.5.md'), deploymentDoc);
  console.log('✓ Created deployment guide');
  
  // Create deployment script
  const deployScript = `#!/bin/bash
# Deployment Script for Call Closure Fix v2.1.5

echo "DEPLOYING RESGRID-ESO BRIDGE v2.1.5 - CALL CLOSURE FIX"
echo "======================================================"

# Stop existing machines
echo "Stopping existing machines..."
flyctl machine stop --app resgrid2eso --force 2>/dev/null || true

# Deploy updated application  
echo "Deploying application..."
flyctl deploy --app resgrid2eso

# Check deployment status
echo "Checking deployment status..."
flyctl status --app resgrid2eso

# Show recent logs
echo "Recent logs:"
flyctl logs --app resgrid2eso --lines 20

echo "DEPLOYMENT COMPLETE - Call closure detection fixes are now active"
`;

  fs.writeFileSync(path.join(packagePath, 'deploy.sh'), deployScript);
  fs.chmodSync(path.join(packagePath, 'deploy.sh'), '755');
  console.log('✓ Created deployment script');
  
  // Create compressed package
  const archivePath = `${packageDir}.tar.gz`;
  const output = fs.createWriteStream(archivePath);
  const archive = archiver('tar', { gzip: true });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`\n✓ Created deployment package: ${archivePath}`);
      console.log(`Package size: ${sizeKB} KB`);
      
      // Create summary
      const summary = `
DEPLOYMENT PACKAGE v2.1.5 CREATED
================================

Package: ${archivePath}
Size: ${sizeKB} KB

FIXES INCLUDED:
✓ Call closure detection (State === 1)
✓ Call Closed field shows timestamps  
✓ Enhanced closure time extraction
✓ Google Sheets timestamp formatting
✓ Real-time SignalR closure detection

DEPLOYMENT COMMAND:
flyctl deploy --app resgrid2eso

The system will now properly detect call closures and populate
the Google Sheets "Call Closed" field with actual timestamps.
`;
      
      console.log(summary);
      resolve(archivePath);
    });
    
    output.on('error', reject);
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(packagePath, false);
    archive.finalize();
  });
}

async function main() {
  try {
    await createDeploymentPackage();
  } catch (error) {
    console.error('Error creating deployment package:', error.message);
  }
}

main().catch(console.error);