/**
 * Create a deployment package for Resgrid-ESO Bridge v1.4.7
 * 
 * This script packages up all required files and creates a deployment-ready
 * zip file with the latest XML field updates and enhanced logging features.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Create a deployment package zip file
 */
function createDeploymentPackage() {
  try {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync('deployment-package')) {
      fs.mkdirSync('deployment-package', { recursive: true });
    }
    
    // Create a clean temp directory
    const tempDir = 'deployment-package/temp';
    if (fs.existsSync(tempDir)) {
      // Delete existing directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create src directory
    fs.mkdirSync(`${tempDir}/src`, { recursive: true });
    
    // Create logs directory
    fs.mkdirSync(`${tempDir}/logs`, { recursive: true });
    
    // Create utils directory
    fs.mkdirSync(`${tempDir}/src/utils`, { recursive: true });
    
    // Copy source files
    console.log('Copying source files...');
    const srcFiles = [
      'src/config.js',
      'src/fix-logger.js',
      'src/resgrid-api.js',
      'src/sheets-logger.js',
      'src/token-manager.js',
      'src/xml-generator.js',
      'src/utils/priority.js'
    ];
    
    srcFiles.forEach(file => {
      const destFile = path.join(tempDir, file);
      fs.copyFileSync(file, destFile);
      console.log(`Copied ${file} to ${destFile}`);
    });
    
    // Copy main application files
    console.log('Copying main application files...');
    const mainFiles = [
      'listener.js',
      'package.json',
      '.env.example',
      'VERSION_SUMMARY_V1.4.7.md'
    ];
    
    mainFiles.forEach(file => {
      const destFile = path.join(tempDir, file);
      fs.copyFileSync(file, destFile);
      console.log(`Copied ${file} to ${destFile}`);
    });
    
    // Create README.md with updated info
    console.log('Creating README.md...');
    const readmeContent = `# Resgrid to ESO Bridge (v1.4.7)

## Overview
This application connects to the Resgrid API, listens for new emergency calls, and forwards them to ESO as XML files via SFTP.

## New in Version 1.4.7
- Enhanced XML upload logging to Google Sheets
- Added Status and XML content columns to the Logs sheet
- Improved unit name handling in XML output
- Better error tracking for failed uploads

## Configuration
Copy \`.env.example\` to \`.env\` and configure the following:

\`\`\`
# Resgrid API credentials
RESGRID_USER=your_username
RESGRID_PASS=your_password

# ESO SFTP credentials
SFTP_HOST=sftp.esosuite.net
SFTP_PORT=22
SFTP_USER=your_sftp_username
SFTP_PASS=your_sftp_password
SFTP_DIR=/incoming

# Google Sheets integration (optional)
GOOGLE_SERVICE_ACCOUNT_JSON={"your_service_account_json_here"}
LOG_SHEET_ID=your_google_sheet_id
\`\`\`

## Running the Application
1. Install dependencies: \`npm install\`
2. Configure environment variables in \`.env\`
3. Start the service: \`node listener.js\`

## Support
For questions or support, refer to the deployment documentation or contact the developer.
`;
    
    fs.writeFileSync(`${tempDir}/README.md`, readmeContent);
    console.log('Created README.md');
    
    // Create .gitignore
    console.log('Creating .gitignore...');
    const gitignoreContent = `node_modules/
.env
logs/*.xml
*.zip
*.log
`;
    
    fs.writeFileSync(`${tempDir}/.gitignore`, gitignoreContent);
    console.log('Created .gitignore');
    
    // Create the deployment zip file with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const zipFilename = `deployment-package/resgrid-eso-bridge_v1.4.7_${timestamp}.zip`;
    
    console.log(`Creating deployment package: ${zipFilename}`);
    
    // Create zip archive using system zip command
    try {
      execSync(`cd ${tempDir} && zip -r ../${path.basename(zipFilename)} .`, { stdio: 'inherit' });
      console.log(`✅ Deployment package created: ${zipFilename}`);
    } catch (error) {
      console.error('Error creating zip file:', error.message);
    }
    
    // Clean up temp directory
    console.log('Cleaning up temporary files...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      success: true,
      filename: zipFilename
    };
  } catch (error) {
    console.error('Failed to create deployment package:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the package creation
const result = createDeploymentPackage();
console.log('Deployment package creation result:', result);