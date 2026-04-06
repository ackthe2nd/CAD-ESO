/**
 * Create a deployment package for Resgrid-ESO Bridge v1.4.8
 * 
 * This script packages up all required files and creates a deployment-ready
 * zip file with the latest Google Sheets integration fixes and enhanced XML logging.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  // Define the version
  const version = '1.4.8';
  const packageName = `resgrid-eso-bridge-v${version}`;
  
  // Define paths
  const deploymentDir = path.join(__dirname, 'deployment-package');
  const sourceDir = __dirname;
  const zipFile = path.join(__dirname, `${packageName}.zip`);
  
  // Create deployment directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  } else {
    // Clear existing directory
    execSync(`rm -rf ${deploymentDir}/*`);
  }
  
  // Copy required files to deployment directory
  console.log(`Creating deployment package for Resgrid-ESO Bridge v${version}...`);
  
  const filesToCopy = [
    // Core application files
    'src/index.js',
    'src/config.js',
    'src/logger.js',
    'src/fix-logger.js', 
    'src/resgrid-api.js',
    'src/token-manager.js',
    'src/xml-generator.js',
    'src/sftp-client.js',
    'src/sheets-logger.js',
    'src/utils.js',
    
    // Supporting files
    'package.json',
    'package-lock.json',
    '.env.example',
    'fly.toml',
    'Dockerfile',
    
    // Documentation
    'README.md',
    `VERSION_SUMMARY_V${version}.md`,
    'DEPLOYMENT.md',
    'FIELD_MAPPING_REFERENCE.md',
    'GOOGLE_SHEETS_EXPORT.md',
    
    // Enhanced test scripts
    'test-xml-upload-logging.js',
    'check-stn1-status-once.js',
    'confirm-stn1-status.js'
  ];
  
  // Create src directory in deployment package
  fs.mkdirSync(path.join(deploymentDir, 'src'), { recursive: true });
  
  // Copy each file
  filesToCopy.forEach(file => {
    try {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(deploymentDir, file);
      
      // Ensure directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied ${file}`);
    } catch (error) {
      console.error(`❌ Error copying ${file}: ${error.message}`);
    }
  });
  
  // Create logs directory
  fs.mkdirSync(path.join(deploymentDir, 'logs'), { recursive: true });
  console.log('✅ Created logs directory');
  
  // Add version file
  fs.writeFileSync(
    path.join(deploymentDir, 'VERSION'),
    `Resgrid-ESO Bridge v${version}\nEnhanced Google Sheets Integration & XML Logging\nBuild date: ${new Date().toISOString()}`
  );
  console.log('✅ Created VERSION file');
  
  // Create zip file
  try {
    execSync(`cd ${deploymentDir} && zip -r ../${packageName}.zip .`);
    console.log(`✅ Created deployment package: ${zipFile}`);
    
    // Get file size
    const stats = fs.statSync(zipFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Package size: ${fileSizeMB} MB`);
  } catch (error) {
    console.error(`❌ Error creating zip file: ${error.message}`);
  }
}

// Run the deployment package creation
createDeploymentPackage();