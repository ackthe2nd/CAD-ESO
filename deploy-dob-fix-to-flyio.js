/**
 * Deploy DOB Reference Id Fix to Fly.io Production
 * Updates the production system with corrected DOB extraction logic
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createFlyioDeployment() {
  console.log('Creating Fly.io deployment with DOB Reference Id fix...');
  
  const deploymentName = `resgrid-eso-bridge-dob-fix-${Date.now()}`;
  const deploymentDir = path.join(__dirname, deploymentName);
  
  // Create deployment directory
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Copy updated source files
  const srcDir = path.join(__dirname, 'src');
  const targetSrcDir = path.join(deploymentDir, 'src');
  
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(targetSrcDir, { recursive: true });
    copyDirectorySync(srcDir, targetSrcDir);
    console.log('✓ Updated source files copied');
  }
  
  // Copy Fly.io deployment files
  const flyioFiles = [
    'package.json',
    'Dockerfile',
    'fly.toml',
    '.env'
  ];
  
  const flyioDir = path.join(__dirname, 'flyio-update');
  
  flyioFiles.forEach(file => {
    const sourcePath = path.join(flyioDir, file);
    const targetPath = path.join(deploymentDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ ${file} copied`);
    }
  });
  
  // Create deployment script
  const deployScript = `#!/bin/bash
# Deploy DOB Reference Id Fix to Fly.io
echo "Deploying Resgrid-ESO Bridge with DOB Reference Id fix..."
echo "Features:"
echo "  - Authentic DOB extraction from CAD Reference Id"
echo "  - YYYY-MM-DD format standardization"
echo "  - Removed hardcoded fallback values"
echo "  - Enhanced debug logging"
echo ""

# Deploy to Fly.io
fly deploy --app resgrid2eso --strategy docker

echo ""
echo "Deployment completed. DOB extraction now uses authentic CAD data."`;
  
  fs.writeFileSync(path.join(deploymentDir, 'deploy.sh'), deployScript);
  fs.chmodSync(path.join(deploymentDir, 'deploy.sh'), '755');
  
  // Create version manifest
  const manifest = {
    version: "2.1.7-dob-fix",
    deploymentDate: new Date().toISOString(),
    features: [
      "DOB extraction from CAD Reference Id field",
      "YYYY-MM-DD format standardization",
      "External Id DOB fallback support",
      "Nature/note text DOB pattern matching",
      "Removed hardcoded 2001-01-01 fallback",
      "Comprehensive DOB debug logging"
    ],
    fixes: [
      "Replaced incorrect hardcoded DOB values",
      "Added authentic CAD data extraction",
      "Format validation for YYYY-MM-DD output"
    ],
    deploymentCommand: "fly deploy --app resgrid2eso",
    healthEndpoint: "https://resgrid2eso.fly.dev/health"
  };
  
  fs.writeFileSync(
    path.join(deploymentDir, 'deployment-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Create deployment archive
  const archivePath = path.join(__dirname, `${deploymentName}.tar.gz`);
  await createArchive(deploymentDir, archivePath);
  
  console.log(`\n🚀 Fly.io deployment package created:`);
  console.log(`Directory: ${deploymentName}/`);
  console.log(`Archive: ${deploymentName}.tar.gz`);
  console.log(`\nTo deploy to Fly.io:`);
  console.log(`1. Extract: tar -xzf ${deploymentName}.tar.gz`);
  console.log(`2. Navigate: cd ${deploymentName}`);
  console.log(`3. Deploy: ./deploy.sh`);
  console.log(`\nProduction will use authentic DOB from CAD Reference Id.`);
  
  return deploymentDir;
}

function copyDirectorySync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function createArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true });
    
    output.on('close', () => {
      console.log(`✓ Archive created: ${archive.pointer()} bytes`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Execute deployment package creation
createFlyioDeployment().catch(console.error);