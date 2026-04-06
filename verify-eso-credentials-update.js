/**
 * Comprehensive ESO Credentials Verification
 * Checks all files for correct ESO SFTP configuration
 */

const fs = require('fs');
const path = require('path');

function verifyESOCredentials() {
  console.log('=== ESO SFTP Credentials Verification ===\n');
  
  const correctCredentials = {
    host: 'sftp.esosuite.net',
    username: 'CA-EMS',
    password: 'EventMedicalPCR1!',
    directory: '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9'
  };
  
  console.log('Expected ESO SFTP Configuration:');
  console.log(`Host: ${correctCredentials.host}`);
  console.log(`Username: ${correctCredentials.username}`);
  console.log(`Directory: ${correctCredentials.directory}\n`);
  
  let allFilesCorrect = true;
  const issues = [];
  
  // Check main .env file
  console.log('1. Checking .env file...');
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    const checks = [
      { name: 'SFTP_HOST', expected: 'sftp.esosuite.net', pattern: /SFTP_HOST=(.+)/ },
      { name: 'SFTP_USERNAME', expected: 'CA-EMS', pattern: /SFTP_USERNAME=(.+)/ },
      { name: 'SFTP_PASSWORD', expected: 'EventMedicalPCR1!', pattern: /SFTP_PASSWORD=(.+)/ },
      { name: 'SFTP_REMOTE_PATH', expected: '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9', pattern: /SFTP_REMOTE_PATH=(.+)/ },
      { name: 'SFTP_USER', expected: 'CA-EMS', pattern: /SFTP_USER=(.+)/ },
      { name: 'SFTP_PASS', expected: 'EventMedicalPCR1!', pattern: /SFTP_PASS=(.+)/ },
      { name: 'SFTP_DIR', expected: '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9', pattern: /SFTP_DIR=(.+)/ }
    ];
    
    checks.forEach(check => {
      const match = envContent.match(check.pattern);
      if (match) {
        const actual = match[1];
        if (actual === check.expected) {
          console.log(`  ✓ ${check.name}: ${actual}`);
        } else {
          console.log(`  ❌ ${check.name}: Expected "${check.expected}", got "${actual}"`);
          allFilesCorrect = false;
          issues.push(`${check.name} in .env has incorrect value`);
        }
      } else {
        console.log(`  ❌ ${check.name}: Not found`);
        allFilesCorrect = false;
        issues.push(`${check.name} missing from .env`);
      }
    });
  } catch (error) {
    console.log(`  ❌ Error reading .env: ${error.message}`);
    allFilesCorrect = false;
    issues.push('.env file not readable');
  }
  
  console.log();
  
  // Check test-eso-sftp-connection.js
  console.log('2. Checking test-eso-sftp-connection.js...');
  try {
    const testContent = fs.readFileSync('test-eso-sftp-connection.js', 'utf8');
    
    if (testContent.includes('CA-EMS') && 
        testContent.includes('EventMedicalPCR1!') && 
        testContent.includes('/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9')) {
      console.log('  ✓ Test file contains correct ESO credentials');
    } else {
      console.log('  ❌ Test file has incorrect credentials');
      allFilesCorrect = false;
      issues.push('test-eso-sftp-connection.js has wrong credentials');
    }
  } catch (error) {
    console.log(`  ❌ Error reading test file: ${error.message}`);
  }
  
  console.log();
  
  // Check production deployment files
  console.log('3. Checking deployment packages...');
  const deploymentFiles = [
    'resgrid-eso-bridge-v1.6.1-production.zip',
    'resgrid-eso-bridge-v1.6.1-final.zip'
  ];
  
  deploymentFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✓ Found ${file}`);
    } else {
      console.log(`  ❌ Missing ${file}`);
      issues.push(`${file} needs to be regenerated with correct credentials`);
    }
  });
  
  console.log();
  
  // Check source files for old references
  console.log('4. Checking source files for old references...');
  const sourceFiles = ['src/index.js', 'fetch-existing-calls.js', 'listener.js'];
  
  sourceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for old references
        const oldReferences = [
          'CAD_12345',
          '/incoming',
          'calls subdirectory'
        ];
        
        const foundOldRefs = oldReferences.filter(ref => content.includes(ref));
        
        if (foundOldRefs.length === 0) {
          console.log(`  ✓ ${file}: No old references found`);
        } else {
          console.log(`  ❌ ${file}: Found old references: ${foundOldRefs.join(', ')}`);
          allFilesCorrect = false;
          issues.push(`${file} contains old ESO references`);
        }
      } catch (error) {
        console.log(`  ❌ Error reading ${file}: ${error.message}`);
      }
    } else {
      console.log(`  ⚠️  ${file}: File not found`);
    }
  });
  
  console.log();
  
  // Summary
  console.log('=== VERIFICATION SUMMARY ===');
  if (allFilesCorrect && issues.length === 0) {
    console.log('✅ ALL ESO CREDENTIALS VERIFIED AND CORRECT');
    console.log('✅ System ready for production deployment');
    console.log('✅ Files contain correct ESO SFTP configuration:');
    console.log(`   • Host: ${correctCredentials.host}`);
    console.log(`   • Username: ${correctCredentials.username}`);
    console.log(`   • Directory: ${correctCredentials.directory}`);
  } else {
    console.log('❌ ISSUES FOUND:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\nRecommendations:');
    console.log('• Update all configuration files with correct ESO credentials');
    console.log('• Regenerate deployment packages');
    console.log('• Test SFTP connection after updates');
  }
  
  return allFilesCorrect && issues.length === 0;
}

// Run verification
if (require.main === module) {
  const success = verifyESOCredentials();
  process.exit(success ? 0 : 1);
}

module.exports = { verifyESOCredentials };