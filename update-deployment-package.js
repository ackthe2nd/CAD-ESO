/**
 * Script to update the deployment package with the fixed API endpoint files
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Updating deployment package with fixed API endpoint files...');

// Create a backup of the existing deployment package
if (fs.existsSync('./resgrid-eso-bridge-deployment.tar.gz')) {
  console.log('Creating backup of existing deployment package...');
  fs.copyFileSync('./resgrid-eso-bridge-deployment.tar.gz', './resgrid-eso-bridge-deployment-backup.tar.gz');
  console.log('Backup created: resgrid-eso-bridge-deployment-backup.tar.gz');
}

// Update the list of files to include in the deployment package
const createDeploymentPackage = require('./create-deployment-package');

// The original list already includes fetch-existing-calls.js, so we need to add our new files
const additionalFiles = [
  'fixed-fetch-existing-calls.js',
  'test-resgrid-calls-api.js'
];

// Make sure the files exist
for (const file of additionalFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Error: File ${file} does not exist. Create it before running this script.`);
    process.exit(1);
  }
}

// Create updated deployment package
console.log('Creating updated deployment package...');
try {
  execSync('node create-deployment-package.js', { stdio: 'inherit' });
  console.log('Deployment package updated successfully!');
} catch (error) {
  console.error(`Error creating deployment package: ${error.message}`);
  process.exit(1);
}

// Create an overview file explaining the new files
const readmeContent = `# Resgrid to ESO Bridge - API Endpoint Fix

This updated deployment package includes additional files to help troubleshoot and fix issues with the Resgrid API endpoints.

## New Files Added:

1. \`fixed-fetch-existing-calls.js\` - An improved version of fetch-existing-calls.js that uses the correct API endpoints:
   - Uses Calls/CallsByDateRange for historical calls 
   - Falls back to Calls/GetActiveCalls if needed
   - Includes better error handling and logging

2. \`test-resgrid-calls-api.js\` - A utility script to test which Resgrid API endpoints are accessible with your credentials:
   - Tests all documented Calls endpoints 
   - Identifies which endpoints work with your specific Resgrid account
   - Provides troubleshooting guidance

## How to Use:

### To test which Resgrid API endpoints work with your credentials:
\`\`\`
node test-resgrid-calls-api.js
\`\`\`

### To process recent calls using the fixed script:
\`\`\`
node fixed-fetch-existing-calls.js --days=7
\`\`\`

### To deploy to Fly.io:
\`\`\`
# Deploy the updated package
fly deploy

# Or to deploy from a specific directory
fly deploy -c fly.toml
\`\`\`

## If Problems Persist:

1. Check if your Resgrid account has the necessary API access permissions
2. Verify that your Resgrid instance supports the API endpoints being used
3. Contact Resgrid support for assistance with API access or endpoint availability
`;

fs.writeFileSync('./FIXED_API_ENDPOINTS.md', readmeContent);
console.log('Created documentation for the API endpoint fixes: FIXED_API_ENDPOINTS.md');

console.log('\nInstructions for deployment:');
console.log('1. Download the updated resgrid-eso-bridge-deployment.tar.gz file');
console.log('2. Extract the archive: tar -xzf resgrid-eso-bridge-deployment.tar.gz');
console.log('3. Deploy using: fly deploy');
console.log('4. Or test locally with: node fixed-fetch-existing-calls.js --days=7');