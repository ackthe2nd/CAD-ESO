/**
 * Final Production Deployment Script
 * Deploys Resgrid-ESO Bridge v2.1.6 with call closure detection and timestamp formatting
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createProductionDeployment() {
  console.log('Creating production deployment package...');
  
  const deploymentName = `resgrid-eso-bridge-production-${Date.now()}`;
  const deploymentDir = path.join(__dirname, deploymentName);
  
  // Create deployment directory
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Copy core source files
  const srcDir = path.join(__dirname, 'src');
  const targetSrcDir = path.join(deploymentDir, 'src');
  
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(targetSrcDir, { recursive: true });
    copyDirectorySync(srcDir, targetSrcDir);
    console.log('✓ Source files copied');
  }
  
  // Copy deployment files
  const deploymentFiles = [
    'package.json',
    'Dockerfile',
    'fly.toml',
    '.env'
  ];
  
  const flyioUpdateDir = path.join(__dirname, 'flyio-update');
  
  deploymentFiles.forEach(file => {
    const sourcePath = path.join(flyioUpdateDir, file);
    const targetPath = path.join(deploymentDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ ${file} copied`);
    }
  });
  
  // Create deployment manifest
  const manifest = {
    version: "2.1.6",
    deploymentDate: new Date().toISOString(),
    features: [
      "CallClosed SignalR event handler",
      "Google Sheets readable timestamps (6/9/2025 1:49:43)",
      "Enhanced CallStateChanged processing",
      "UnitStatusSet event monitoring",
      "Real-time call closure detection",
      "Pacific Time preservation"
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
  
  console.log(`\n🚀 Production deployment package created:`);
  console.log(`Directory: ${deploymentName}/`);
  console.log(`Archive: ${deploymentName}.tar.gz`);
  console.log(`\nTo deploy to Fly.io:`);
  console.log(`1. Extract: tar -xzf ${deploymentName}.tar.gz`);
  console.log(`2. Navigate: cd ${deploymentName}`);
  console.log(`3. Deploy: fly deploy --app resgrid2eso`);
  console.log(`\nProduction will include enhanced call closure detection and readable timestamps.`);
  
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

// Execute deployment creation
createProductionDeployment().catch(console.error);