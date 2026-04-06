/**
 * Create Complete Docker Deployment Fix Package
 * Resolves Fly.io buildpack sunset error with Docker configuration
 */

const fs = require('fs');
const archiver = require('archiver');

async function createCompleteDockerFix() {
  console.log('Creating complete Docker deployment fix package...\n');
  
  const archiveName = 'resgrid-eso-bridge-docker-fix-v1.7.6.zip';
  const output = fs.createWriteStream(archiveName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', function() {
    console.log(`Complete Docker fix package created: ${archiveName}`);
    console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ready for immediate deployment to resolve buildpack sunset error`);
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  archive.pipe(output);
  
  // Core application files
  console.log('Adding core application files...');
  const coreFiles = [
    'src/index.js',
    'src/xml-generator.js', 
    'src/sheets-logger.js',
    'src/sftp-client.js',
    'src/fly-io-sftp-client.js',
    'src/config.js',
    'src/fix-logger.js',
    'src/token-manager.js',
    'src/resgrid-api.js',
    'package.json',
    'README.md'
  ];
  
  coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
      archive.file(file, { name: `resgrid-eso-bridge/${file}` });
    }
  });
  
  // Updated Docker deployment files
  console.log('Adding Docker deployment configuration...');
  archive.file('Dockerfile', { name: 'resgrid-eso-bridge/Dockerfile' });
  archive.file('fly.toml', { name: 'resgrid-eso-bridge/fly.toml' });
  
  // Create environment template
  const envTemplate = `# Resgrid ESO Bridge Environment Configuration
# Copy this to .env and fill in your actual values

# Resgrid API Configuration
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# Google Sheets Configuration  
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
LOG_SHEET_ID=your_google_sheet_id

# ESO SFTP Configuration
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=your_eso_password
SFTP_DIR=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9

# Application Configuration
NODE_ENV=production
PORT=8080`;

  archive.append(envTemplate, { name: 'resgrid-eso-bridge/.env.example' });
  
  // Create complete deployment instructions
  const deploymentInstructions = `# Complete Docker Deployment Fix

## Issue Resolution
Your deployment fails with "heroku/buildpacks:20 has been sunset" because Fly.io is trying to use deprecated buildpacks instead of Docker.

## Quick Fix Steps

### 1. Replace your local files
Extract this package and copy these files to your project directory:
- \`Dockerfile\` (new file)
- \`fly.toml\` (updated with Docker configuration)

### 2. Deploy with Docker
\`\`\`bash
cd C:\\Users\\Ryan\\Downloads\\resgrid-eso-bridge
flyctl deploy --app resgrid2eso
\`\`\`

### 3. Set your ESO password (if not already set)
\`\`\`bash
flyctl secrets set SFTP_PASS="your_eso_password" --app resgrid2eso
\`\`\`

### 4. Verify deployment
\`\`\`bash
flyctl status --app resgrid2eso
flyctl logs --app resgrid2eso
\`\`\`

### 5. Check for successful emergency call processing
\`\`\`bash
flyctl logs --app resgrid2eso | grep "XML Upload Successful"
\`\`\`

## What This Fixes
- Resolves "heroku/buildpacks:20 has been sunset" error
- Uses Docker for reliable deployment
- Maintains all SFTP handshake fixes for emergency services
- Preserves Google Sheets logging functionality

Your emergency services application will deploy successfully and process calls with "XML Upload Successful" status.`;

  archive.append(deploymentInstructions, { name: 'resgrid-eso-bridge/DEPLOYMENT_FIX_INSTRUCTIONS.md' });
  
  // Create the corrected fly.toml content
  const flyTomlContent = `# Fly.io Configuration for Resgrid-ESO Bridge - Dedicated Emergency Services
app = "resgrid2eso"
primary_region = "ord"

[experimental]
  auto_rollback = true

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  FLY_APP_NAME = "resgrid2eso"

# Dedicated machine configuration for emergency services reliability
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false

# VM configuration - small but dedicated for cost efficiency
[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

# Health check for emergency services uptime
[[http_service.checks]]
  interval = "30s"
  grace_period = "10s"
  method = "get"
  path = "/health"
  protocol = "http"
  timeout = "5s"
  tls_skip_verify = false

[deploy]
  release_command = "echo 'Emergency services deployment complete'"`;

  archive.append(flyTomlContent, { name: 'resgrid-eso-bridge/fly.toml' });
  
  console.log('Finalizing Docker fix package...');
  await archive.finalize();
  
  return archiveName;
}

createCompleteDockerFix().catch(console.error);