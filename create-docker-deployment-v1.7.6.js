/**
 * Create Docker Deployment Package v1.7.6
 * Final package with Docker deployment to resolve deprecated buildpack issue
 */

const fs = require('fs');
const archiver = require('archiver');

async function createDockerDeployment() {
  console.log('Creating Docker Deployment Package v1.7.6...\n');
  
  const archiveName = 'resgrid-eso-bridge-docker-v1.7.6.zip';
  const output = fs.createWriteStream(archiveName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', function() {
    console.log(`Docker deployment package created: ${archiveName}`);
    console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ready for immediate Fly.io deployment`);
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  archive.pipe(output);
  
  // Core application files with SFTP fix
  console.log('Adding application files with Docker deployment...');
  archive.file('src/index.js', { name: 'resgrid-eso-bridge/src/index.js' });
  archive.file('src/xml-generator.js', { name: 'resgrid-eso-bridge/src/xml-generator.js' });
  archive.file('src/sheets-logger.js', { name: 'resgrid-eso-bridge/src/sheets-logger.js' });
  archive.file('src/sftp-client.js', { name: 'resgrid-eso-bridge/src/sftp-client.js' });
  archive.file('src/fly-io-sftp-client.js', { name: 'resgrid-eso-bridge/src/fly-io-sftp-client.js' });
  
  // Supporting modules
  const supportFiles = [
    'src/config.js',
    'src/fix-logger.js',
    'src/token-manager.js',
    'src/resgrid-api.js'
  ];
  
  supportFiles.forEach(file => {
    if (fs.existsSync(file)) {
      archive.file(file, { name: `resgrid-eso-bridge/${file}` });
    }
  });
  
  // Docker deployment files
  archive.file('Dockerfile', { name: 'resgrid-eso-bridge/Dockerfile' });
  archive.file('fly.toml', { name: 'resgrid-eso-bridge/fly.toml' });
  archive.file('package.json', { name: 'resgrid-eso-bridge/package.json' });
  archive.file('.env.resgrid-bridge', { name: 'resgrid-eso-bridge/.env.example' });
  archive.file('README.md', { name: 'resgrid-eso-bridge/README.md' });
  
  // Deployment documentation
  archive.file('deploy-to-fly.md', { name: 'resgrid-eso-bridge/DEPLOYMENT_INSTRUCTIONS.md' });
  
  // Create deployment commands file
  const deploymentCommands = `# Fly.io Docker Deployment Commands

## Fix for Deprecated Buildpack Error

The deployment now uses Docker instead of the deprecated Heroku buildpack.

## Deployment Steps

1. Set secrets in Fly.io:
\`\`\`bash
flyctl secrets set RESGRID_USER="your_username" --app resgrid2eso
flyctl secrets set RESGRID_PASS="your_password" --app resgrid2eso
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --app resgrid2eso
flyctl secrets set LOG_SHEET_ID="your_sheet_id" --app resgrid2eso
flyctl secrets set SFTP_HOST="sftp.esosuite.net" --app resgrid2eso
flyctl secrets set SFTP_USER="CA-EMS" --app resgrid2eso
flyctl secrets set SFTP_PASS="your_eso_password" --app resgrid2eso
flyctl secrets set SFTP_DIR="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9" --app resgrid2eso
\`\`\`

2. Deploy with Docker:
\`\`\`bash
flyctl deploy --app resgrid2eso
\`\`\`

3. Monitor deployment:
\`\`\`bash
flyctl logs --app resgrid2eso
flyctl status --app resgrid2eso
\`\`\`

4. Verify SFTP handshake fix:
\`\`\`bash
flyctl logs --app resgrid2eso | grep "XML Upload Successful"
\`\`\`

The Docker deployment resolves the buildpack sunset issue and includes the verified SFTP handshake fix for emergency services processing.`;

  archive.append(deploymentCommands, { name: 'resgrid-eso-bridge/DOCKER_DEPLOYMENT_COMMANDS.md' });
  
  console.log('Finalizing Docker deployment package...');
  await archive.finalize();
  
  return archiveName;
}

createDockerDeployment().catch(console.error);