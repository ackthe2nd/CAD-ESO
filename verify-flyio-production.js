/**
 * Verify Fly.io Production Status
 * Check if the production system is running independently
 */

const https = require('https');
const http = require('http');

async function checkFlyioStatus() {
  console.log('🔍 Checking Fly.io production status...\n');
  
  // Check Fly.io app status
  const appUrl = 'https://resgrid2eso.fly.dev';
  
  try {
    const response = await makeRequest(appUrl);
    console.log('✅ Fly.io app is responding');
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.data.substring(0, 200)}...\n`);
  } catch (error) {
    console.log('❌ Fly.io app is not responding');
    console.log(`Error: ${error.message}\n`);
  }
  
  // Check if it's a background service (no HTTP endpoint)
  console.log('📋 Production System Check:');
  console.log('- App Name: resgrid2eso');
  console.log('- Type: Background service (SignalR + SFTP)');
  console.log('- Expected: No HTTP endpoint (404 is normal)');
  console.log('- Monitoring: SignalR events + 60-second polling');
  console.log('- Independence: Should run without Replit\n');
  
  console.log('🔧 To verify production is running:');
  console.log('1. Check Fly.io logs: fly logs -a resgrid2eso');
  console.log('2. Check machine status: fly status -a resgrid2eso');
  console.log('3. Monitor Google Sheets for new entries');
  console.log('4. Test with new Resgrid call');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

checkFlyioStatus().catch(console.error);