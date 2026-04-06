/**
 * Check ESO Directory Structure
 * Explore the directory structure to see if files are moved after upload
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');

async function checkESODirectoryStructure() {
  console.log('=== ESO Directory Structure Check ===\n');
  
  const sftp = new SftpClient();
  
  try {
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASS
    });
    
    console.log('Connected to ESO SFTP server\n');
    
    // Check root directory
    console.log('1. Root directory contents:');
    try {
      const rootFiles = await sftp.list('/');
      console.log(`Found ${rootFiles.length} items in root:`);
      rootFiles.forEach(item => {
        const type = item.type === 'd' ? 'DIR' : 'FILE';
        console.log(`  ${type}: ${item.name}`);
      });
    } catch (error) {
      console.log(`Cannot list root: ${error.message}`);
    }
    
    console.log('\n2. CA-EMS directory contents:');
    try {
      const caEmsFiles = await sftp.list('/CA-EMS');
      console.log(`Found ${caEmsFiles.length} items in /CA-EMS:`);
      caEmsFiles.forEach(item => {
        const type = item.type === 'd' ? 'DIR' : 'FILE';
        console.log(`  ${type}: ${item.name}`);
      });
    } catch (error) {
      console.log(`Cannot list /CA-EMS: ${error.message}`);
    }
    
    console.log('\n3. Upload directory contents:');
    const uploadDir = process.env.SFTP_DIR;
    try {
      const uploadFiles = await sftp.list(uploadDir);
      console.log(`Found ${uploadFiles.length} items in ${uploadDir}:`);
      uploadFiles.forEach(item => {
        const type = item.type === 'd' ? 'DIR' : 'FILE';
        const size = item.size ? `(${item.size} bytes)` : '';
        const modified = item.modifyTime ? new Date(item.modifyTime).toLocaleString() : '';
        console.log(`  ${type}: ${item.name} ${size} ${modified}`);
      });
    } catch (error) {
      console.log(`Cannot list ${uploadDir}: ${error.message}`);
    }
    
    // Check for common subdirectories
    const commonDirs = ['processed', 'incoming', 'archive', 'pending', 'completed'];
    
    for (const dir of commonDirs) {
      const fullPath = `/CA-EMS/${dir}`;
      console.log(`\n4. Checking ${fullPath}:`);
      try {
        const exists = await sftp.exists(fullPath);
        if (exists) {
          const files = await sftp.list(fullPath);
          console.log(`  Found ${files.length} items in ${fullPath}`);
          files.slice(0, 5).forEach(item => {
            const type = item.type === 'd' ? 'DIR' : 'FILE';
            console.log(`    ${type}: ${item.name}`);
          });
        } else {
          console.log(`  Directory does not exist`);
        }
      } catch (error) {
        console.log(`  Cannot access: ${error.message}`);
      }
    }
    
    // Upload a test file and immediately check if it appears
    console.log('\n5. Real-time upload test:');
    const testContent = `<?xml version="1.0"?><test>${Date.now()}</test>`;
    const testFileName = `realtime-test-${Date.now()}.xml`;
    const testPath = `${uploadDir}/${testFileName}`;
    
    console.log(`Uploading ${testFileName}...`);
    await sftp.put(Buffer.from(testContent), testPath);
    console.log('Upload completed');
    
    // Immediately check if file appears
    console.log('Checking if file appears in directory...');
    const afterUpload = await sftp.list(uploadDir);
    const testFile = afterUpload.find(f => f.name === testFileName);
    
    if (testFile) {
      console.log(`✅ File found: ${testFile.name} (${testFile.size} bytes)`);
    } else {
      console.log('❌ File not visible in directory listing');
      console.log('This suggests ESO processes files immediately after upload');
    }
    
    // Check if file exists directly
    const fileExists = await sftp.exists(testPath);
    console.log(`Direct file check: ${fileExists}`);
    
  } catch (error) {
    console.error(`Directory check failed: ${error.message}`);
    
  } finally {
    try {
      await sftp.end();
      console.log('\nSFTP connection closed');
    } catch (closeError) {
      console.warn(`Error closing SFTP: ${closeError.message}`);
    }
  }
}

checkESODirectoryStructure().catch(console.error);