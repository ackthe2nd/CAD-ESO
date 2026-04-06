/**
 * Verify ESO Uploads - Check if XML files are actually reaching ESO server
 * This script connects to ESO SFTP and lists recent uploads to confirm delivery
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');

async function verifyESOUploads() {
  console.log('=== ESO Upload Verification ===\n');
  
  const sftp = new SftpClient();
  
  try {
    // Connect to ESO SFTP server
    console.log('Connecting to ESO SFTP server...');
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASS,
      retries: 3,
      retry_factor: 2,
      retry_minTimeout: 2000
    });
    
    console.log('✅ Connected successfully\n');
    
    // List files in the upload directory
    const remoteDir = process.env.SFTP_DIR;
    console.log(`Checking directory: ${remoteDir}`);
    
    const fileList = await sftp.list(remoteDir);
    
    console.log(`\n📁 Found ${fileList.length} files in ESO directory:\n`);
    
    if (fileList.length === 0) {
      console.log('❌ No files found - uploads may not be reaching ESO server');
      return false;
    }
    
    // Sort files by modification time (newest first)
    const sortedFiles = fileList
      .filter(file => file.name.endsWith('.xml'))
      .sort((a, b) => new Date(b.modifyTime) - new Date(a.modifyTime));
    
    console.log('Recent XML uploads:');
    console.log('==================');
    
    sortedFiles.slice(0, 10).forEach((file, index) => {
      const uploadTime = new Date(file.modifyTime).toLocaleString();
      const sizeKB = (file.size / 1024).toFixed(1);
      
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Size: ${sizeKB} KB`);
      console.log(`   Uploaded: ${uploadTime}`);
      console.log('');
    });
    
    // Check for recent uploads (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentUploads = sortedFiles.filter(file => 
      new Date(file.modifyTime) > twoHoursAgo
    );
    
    console.log(`\n📊 Upload Statistics:`);
    console.log(`Total XML files: ${sortedFiles.length}`);
    console.log(`Recent uploads (last 2 hours): ${recentUploads.length}`);
    
    if (recentUploads.length > 0) {
      console.log('\n✅ VERIFICATION SUCCESSFUL');
      console.log('XML files are being successfully uploaded to ESO server');
      
      // Show the most recent file content preview
      if (recentUploads.length > 0) {
        const latestFile = recentUploads[0];
        console.log(`\n📄 Latest file preview: ${latestFile.name}`);
        
        try {
          const fileContent = await sftp.get(`${remoteDir}/${latestFile.name}`);
          const preview = fileContent.toString().substring(0, 500);
          console.log('Content preview:');
          console.log('---------------');
          console.log(preview);
          if (fileContent.length > 500) {
            console.log('... (truncated)');
          }
        } catch (previewError) {
          console.log('Could not preview file content');
        }
      }
      
    } else {
      console.log('\n⚠️  WARNING: No recent uploads found');
      console.log('Check if the application is running and processing calls');
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
    return false;
    
  } finally {
    try {
      await sftp.end();
      console.log('\nSFTP connection closed');
    } catch (closeError) {
      console.warn('Error closing SFTP connection:', closeError.message);
    }
  }
}

// Run verification
verifyESOUploads().then(success => {
  if (success) {
    console.log('\n🚀 ESO upload verification completed successfully');
  } else {
    console.log('\n❌ ESO upload verification failed');
  }
}).catch(error => {
  console.error('Verification script error:', error);
  process.exit(1);
});