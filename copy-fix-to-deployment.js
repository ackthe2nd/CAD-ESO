/**
 * Script to copy the fixed files to the deployment package
 */
const fs = require('fs');
const path = require('path');

console.log('Copying fixed files to deployment package...');

// Files to copy
const filesToCopy = [
  { src: './fixed-fetch-existing-calls.js', dest: './deployment-package/fixed-fetch-existing-calls.js' },
  { src: './test-resgrid-calls-api.js', dest: './deployment-package/test-resgrid-calls-api.js' },
  { src: './FIXED_API_ENDPOINTS.md', dest: './deployment-package/FIXED_API_ENDPOINTS.md' }
];

// Create deployment package directory if it doesn't exist
if (!fs.existsSync('./deployment-package')) {
  fs.mkdirSync('./deployment-package', { recursive: true });
}

// Copy files
for (const file of filesToCopy) {
  try {
    fs.copyFileSync(file.src, file.dest);
    console.log(`Copied ${file.src} to ${file.dest}`);
  } catch (error) {
    console.error(`Error copying ${file.src}: ${error.message}`);
  }
}

console.log('\nFiles copied successfully to deployment package.');
console.log('To create the final tarball, run:');
console.log('cd deployment-package && tar -czf ../resgrid-eso-bridge-deployment-fixed.tar.gz *');