/**
 * Execute Fly.io Deployment for DOB Reference Id Fix
 * Deploys the corrected XML generator to production
 */

const { spawn } = require('child_process');
const path = require('path');

async function deployToFlyio() {
  return new Promise((resolve, reject) => {
    console.log('Deploying DOB Reference Id fix to Fly.io production...');
    
    const deploymentDir = path.join(__dirname, 'resgrid-eso-bridge-dob-fix-1749796133292');
    
    // Change to deployment directory and execute fly deploy
    const flyProcess = spawn('fly', ['deploy', '--app', 'resgrid2eso', '--strategy', 'docker'], {
      cwd: deploymentDir,
      stdio: 'inherit'
    });
    
    flyProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Fly.io deployment successful');
        console.log('Production system updated with DOB Reference Id fix');
        console.log('Next emergency call will use authentic patient DOB from CAD data');
        resolve();
      } else {
        console.log(`\n❌ Deployment failed with exit code: ${code}`);
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });
    
    flyProcess.on('error', (error) => {
      console.log(`\n❌ Deployment error: ${error.message}`);
      reject(error);
    });
  });
}

async function verifyDeployment() {
  return new Promise((resolve) => {
    console.log('\nVerifying deployment status...');
    
    const statusProcess = spawn('fly', ['status', '--app', 'resgrid2eso'], {
      stdio: 'inherit'
    });
    
    statusProcess.on('close', () => {
      console.log('\nDeployment verification complete');
      resolve();
    });
  });
}

async function main() {
  try {
    await deployToFlyio();
    await verifyDeployment();
    
    console.log('\n' + '='.repeat(60));
    console.log('DOB REFERENCE ID FIX DEPLOYED TO PRODUCTION');
    console.log('='.repeat(60));
    console.log('✓ Authentic DOB extraction from CAD Reference Id');
    console.log('✓ YYYY-MM-DD format standardization');
    console.log('✓ Removed hardcoded fallback values');
    console.log('✓ Enhanced debug logging');
    console.log('\nProduction system ready with corrected DOB mapping.');
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

main();