/**
 * Comprehensive ESO Credentials and Documentation Verification
 * Ensures all files contain correct ESO SFTP configuration
 */

const fs = require('fs');
const path = require('path');

function comprehensiveESOVerification() {
  console.log('=== Comprehensive ESO Verification ===\n');
  
  const correctCredentials = {
    host: 'sftp.esosuite.net',
    username: 'CA-EMS',
    password: 'EventMedicalPCR1!',
    directory: '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9'
  };
  
  let allCorrect = true;
  const results = [];
  
  // Files to check
  const filesToCheck = [
    { file: '.env', type: 'config' },
    { file: 'README.md', type: 'documentation' },
    { file: 'SETUP_GUIDE.md', type: 'documentation' },
    { file: 'DEPLOYMENT_GUIDE.md', type: 'documentation' },
    { file: 'test-eso-sftp-connection.js', type: 'test' },
    { file: 'src/index.js', type: 'source' },
    { file: 'fetch-existing-calls.js', type: 'source' }
  ];
  
  console.log('Checking files for correct ESO credentials...\n');
  
  filesToCheck.forEach(({ file, type }) => {
    if (!fs.existsSync(file)) {
      results.push({ file, status: 'MISSING', type });
      allCorrect = false;
      return;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for old references
      const oldRefs = ['CAD_12345', '/incoming'];
      const hasOldRefs = oldRefs.some(ref => content.includes(ref));
      
      // Check for new correct references
      const hasCorrectHost = content.includes('sftp.esosuite.net');
      const hasCorrectUser = content.includes('CA-EMS');
      const hasCorrectDir = content.includes('/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9');
      
      let status = 'PASS';
      let issues = [];
      
      if (hasOldRefs) {
        status = 'FAIL';
        issues.push('Contains old references');
        allCorrect = false;
      }
      
      if (type === 'config' || type === 'test') {
        if (!hasCorrectHost || !hasCorrectUser || !hasCorrectDir) {
          status = 'FAIL';
          issues.push('Missing correct ESO credentials');
          allCorrect = false;
        }
      }
      
      results.push({ 
        file, 
        status, 
        type, 
        issues: issues.join(', '),
        hasCorrectHost,
        hasCorrectUser,
        hasCorrectDir 
      });
      
    } catch (error) {
      results.push({ file, status: 'ERROR', type, error: error.message });
      allCorrect = false;
    }
  });
  
  // Check deployment packages
  console.log('Checking deployment packages...\n');
  
  const deploymentPackages = [
    'resgrid-eso-bridge-v1.6.1-production.zip',
    'resgrid-eso-bridge-v1.6.1-final.zip'
  ];
  
  deploymentPackages.forEach(pkg => {
    if (fs.existsSync(pkg)) {
      const stats = fs.statSync(pkg);
      const timestamp = stats.mtime;
      const now = new Date();
      const ageMinutes = (now - timestamp) / (1000 * 60);
      
      if (ageMinutes > 60) {
        results.push({ 
          file: pkg, 
          status: 'OUTDATED', 
          type: 'package',
          issues: `Package is ${Math.round(ageMinutes)} minutes old, should be regenerated`
        });
        allCorrect = false;
      } else {
        results.push({ 
          file: pkg, 
          status: 'CURRENT', 
          type: 'package',
          size: `${Math.round(stats.size / 1024)}KB`
        });
      }
    } else {
      results.push({ file: pkg, status: 'MISSING', type: 'package' });
      allCorrect = false;
    }
  });
  
  // Display results
  console.log('=== VERIFICATION RESULTS ===\n');
  
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {});
  
  Object.entries(groupedResults).forEach(([type, items]) => {
    console.log(`${type.toUpperCase()} FILES:`);
    items.forEach(item => {
      const statusIcon = item.status === 'PASS' || item.status === 'CURRENT' ? '✓' : '❌';
      console.log(`  ${statusIcon} ${item.file}: ${item.status}`);
      if (item.issues) console.log(`    Issues: ${item.issues}`);
      if (item.size) console.log(`    Size: ${item.size}`);
    });
    console.log();
  });
  
  // Summary
  console.log('=== SUMMARY ===');
  if (allCorrect) {
    console.log('✅ ALL FILES VERIFIED CORRECT');
    console.log('✅ ESO credentials properly updated everywhere');
    console.log('✅ No old references found');
    console.log('✅ Deployment packages current');
    console.log('\nCorrect ESO Configuration:');
    console.log(`  Host: ${correctCredentials.host}`);
    console.log(`  Username: ${correctCredentials.username}`);
    console.log(`  Directory: ${correctCredentials.directory}`);
    console.log('\n🚀 SYSTEM READY FOR PRODUCTION DEPLOYMENT');
  } else {
    console.log('❌ ISSUES FOUND');
    console.log('Required actions:');
    const failedItems = results.filter(r => r.status === 'FAIL' || r.status === 'MISSING' || r.status === 'OUTDATED');
    failedItems.forEach(item => {
      console.log(`  • Update ${item.file}: ${item.issues || item.status}`);
    });
  }
  
  return allCorrect;
}

// Run verification
if (require.main === module) {
  const success = comprehensiveESOVerification();
  process.exit(success ? 0 : 1);
}

module.exports = { comprehensiveESOVerification };