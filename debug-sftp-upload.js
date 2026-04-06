/**
 * Debug SFTP Upload Process
 * Test the exact upload process with detailed logging
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

async function debugSFTPUpload() {
  console.log('=== SFTP Upload Debug ===\n');
  
  console.log('Configuration:');
  console.log(`Host: ${process.env.SFTP_HOST}`);
  console.log(`Port: ${process.env.SFTP_PORT || 22}`);
  console.log(`Username: ${process.env.SFTP_USER}`);
  console.log(`Directory: ${process.env.SFTP_DIR}`);
  console.log('');
  
  const sftp = new SftpClient();
  
  try {
    // Create test XML file
    const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument>
  <id root="debug-test-${Date.now()}" />
  <effectiveTime value="20250605" />
  <recordTarget>
    <patientRole>
      <id nullFlavor="NI" />
    </patientRole>
  </recordTarget>
</ClinicalDocument>`;

    const tempDir = '/tmp/resgrid-eso-transfer';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const localFile = path.join(tempDir, `debug-test-${Date.now()}.xml`);
    fs.writeFileSync(localFile, testXML);
    
    console.log(`Created test file: ${localFile}`);
    console.log(`File size: ${fs.statSync(localFile).size} bytes\n`);
    
    // Step 1: Connect
    console.log('Step 1: Connecting to SFTP server...');
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASS,
      retries: 3,
      retry_factor: 2,
      retry_minTimeout: 2000,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3,
      readyTimeout: 20000
    });
    console.log('✅ Connected successfully\n');
    
    // Step 2: Check current working directory
    console.log('Step 2: Checking current working directory...');
    const cwd = await sftp.cwd();
    console.log(`Current directory: ${cwd}\n`);
    
    // Step 3: Check if target directory exists
    console.log('Step 3: Checking target directory...');
    const targetDir = process.env.SFTP_DIR;
    const dirExists = await sftp.exists(targetDir);
    console.log(`Directory ${targetDir} exists: ${dirExists}\n`);
    
    if (!dirExists) {
      console.log('Directory does not exist. Attempting to create...');
      try {
        await sftp.mkdir(targetDir, true);
        console.log('✅ Directory created successfully\n');
      } catch (mkdirError) {
        console.log(`❌ Failed to create directory: ${mkdirError.message}\n`);
      }
    }
    
    // Step 4: List directory permissions
    console.log('Step 4: Checking directory permissions...');
    try {
      const dirStats = await sftp.stat(targetDir);
      console.log(`Directory permissions: ${dirStats.mode.toString(8)}`);
      console.log(`Directory owner: ${dirStats.uid}`);
      console.log(`Directory group: ${dirStats.gid}\n`);
    } catch (statError) {
      console.log(`Could not get directory stats: ${statError.message}\n`);
    }
    
    // Step 5: Try to list directory contents
    console.log('Step 5: Listing directory contents...');
    try {
      const fileList = await sftp.list(targetDir);
      console.log(`Directory contains ${fileList.length} items`);
      if (fileList.length > 0) {
        fileList.slice(0, 5).forEach(file => {
          console.log(`  ${file.name} (${file.size} bytes)`);
        });
      }
      console.log('');
    } catch (listError) {
      console.log(`❌ Failed to list directory: ${listError.message}\n`);
    }
    
    // Step 6: Upload test file
    console.log('Step 6: Uploading test file...');
    const remoteFile = `${targetDir}/debug-test-${Date.now()}.xml`;
    console.log(`Local: ${localFile}`);
    console.log(`Remote: ${remoteFile}`);
    
    try {
      await sftp.put(localFile, remoteFile);
      console.log('✅ Upload completed\n');
      
      // Step 7: Verify upload
      console.log('Step 7: Verifying upload...');
      const uploadExists = await sftp.exists(remoteFile);
      console.log(`File exists on server: ${uploadExists}`);
      
      if (uploadExists) {
        const fileStats = await sftp.stat(remoteFile);
        console.log(`Uploaded file size: ${fileStats.size} bytes`);
        console.log(`Upload time: ${new Date(fileStats.mtime)}`);
        
        // Try to read back a portion of the file
        console.log('\nReading back file content...');
        try {
          const content = await sftp.get(remoteFile);
          console.log('File content preview:');
          console.log(content.toString().substring(0, 200));
        } catch (readError) {
          console.log(`Could not read file: ${readError.message}`);
        }
      }
      
    } catch (uploadError) {
      console.log(`❌ Upload failed: ${uploadError.message}`);
      console.log(`Error details: ${uploadError.stack}`);
    }
    
    // Clean up local file
    fs.unlinkSync(localFile);
    console.log('\nLocal test file cleaned up');
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(`Error details: ${error.stack}`);
    
  } finally {
    try {
      await sftp.end();
      console.log('SFTP connection closed');
    } catch (closeError) {
      console.warn(`Error closing SFTP: ${closeError.message}`);
    }
  }
}

debugSFTPUpload().catch(console.error);