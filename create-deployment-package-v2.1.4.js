/**
 * Create Deployment Package v2.1.4
 * Includes all recent improvements:
 * - XML namespace compliance fixes
 * - Enhanced logging with CallId context
 * - Environment validation
 * - ChatGPT audit implementations
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_VERSION = 'v2.1.4';
const PACKAGE_DIR = `deployment-package-${PACKAGE_VERSION}`;

function createDeploymentPackage() {
  console.log(`🚀 Creating deployment package ${PACKAGE_VERSION}...`);
  
  // Create package directory structure
  if (fs.existsSync(PACKAGE_DIR)) {
    console.log(`📁 Removing existing ${PACKAGE_DIR}...`);
    fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
  }
  
  console.log(`📁 Creating ${PACKAGE_DIR} directory structure...`);
  fs.mkdirSync(PACKAGE_DIR);
  fs.mkdirSync(path.join(PACKAGE_DIR, 'src'));
  
  // Copy core source files
  const sourceFiles = [
    'src/index.js',
    'src/xml-generator.js',
    'src/sheets-logger.js',
    'src/environment-validator.js'
  ];
  
  console.log('📋 Copying core source files...');
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(path.join(PACKAGE_DIR, file), content);
      console.log(`   ✅ Copied ${file}`);
    } else {
      console.log(`   ⚠️  Missing ${file}`);
    }
  }
  
  // Copy configuration files
  const configFiles = [
    'package.json',
    '.env.resgrid-bridge',
    'Dockerfile',
    '.dockerignore',
    'fly.toml'
  ];
  
  console.log('🔧 Copying configuration files...');
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(path.join(PACKAGE_DIR, file), content);
      console.log(`   ✅ Copied ${file}`);
    } else {
      console.log(`   ⚠️  Missing ${file} (optional)`);
    }
  }
  
  // Create deployment documentation
  const deploymentReadme = `# Resgrid-ESO Bridge Deployment Package ${PACKAGE_VERSION}

## Version ${PACKAGE_VERSION} Features

### ✅ Recent Improvements
- **XML Namespace Compliance**: Fixed critical xmlns_xsi → xmlns:xsi syntax error
- **Enhanced Logging**: All log messages include [Call {callId}] context for improved debugging
- **Environment Validation**: Startup validation ensures all required secrets are configured
- **Code Cleanup**: Archived unused XML generator variants and legacy files
- **System Stability**: Comprehensive audit implementation based on ChatGPT analysis

### 🚀 Deployment Instructions

#### 1. Environment Setup
\`\`\`bash
# Copy environment template
cp .env.resgrid-bridge .env

# Configure required secrets:
# - RESGRID_USER
# - RESGRID_PASS  
# - GOOGLE_SERVICE_ACCOUNT_JSON
# - LOG_SHEET_ID
\`\`\`

#### 2. Local Development
\`\`\`bash
npm install
npm start
\`\`\`

#### 3. Production Deployment (Fly.io)
\`\`\`bash
# Deploy to Fly.io
fly deploy

# Set secrets
fly secrets set RESGRID_USER="your_username"
fly secrets set RESGRID_PASS="your_password"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
fly secrets set LOG_SHEET_ID="your_sheet_id"
\`\`\`

### 📋 System Features
- Real-time SignalR integration with Resgrid
- Automated XML generation with ESO compliance
- SFTP upload to ESO with retry logic
- Comprehensive Google Sheets logging
- Health monitoring and status reporting
- Automatic call polling backup mechanism
- XML integrity verification
- Patient information extraction
- Location field parsing from incident details
- Pacific Time timestamp preservation

### 🔧 Technical Specifications
- Node.js microservice architecture
- SignalR real-time event processing  
- XML generation with proper namespace formatting
- SFTP integration with ESO systems
- Google Sheets API integration
- Comprehensive error handling and logging
- Environment validation and fail-fast startup

### 📊 Monitoring & Health Checks
- Health endpoint: \`GET /health\`
- Real-time logging to Google Sheets
- XML upload status tracking
- Call processing metrics
- SignalR connection monitoring

---
**Package Version**: ${PACKAGE_VERSION}  
**Build Date**: ${new Date().toISOString()}  
**Status**: Production Ready
`;

  fs.writeFileSync(path.join(PACKAGE_DIR, 'README.md'), deploymentReadme);
  console.log('   ✅ Created deployment README.md');
  
  // Create version info file
  const versionInfo = {
    version: PACKAGE_VERSION,
    buildDate: new Date().toISOString(),
    features: [
      'XML namespace compliance (xmlns:xsi)',
      'Enhanced logging with CallId context',
      'Environment validation',
      'Code cleanup and optimization',
      'ChatGPT audit implementations'
    ],
    deploymentReady: true,
    changelog: {
      'v2.1.4': [
        'Fixed critical XML namespace syntax error (xmlns_xsi → xmlns:xsi)',
        'Applied fix across all deployment packages',
        'Enhanced logging with [Call {callId}] context',
        'Added startup environment validation',
        'Implemented ChatGPT audit recommendations',
        'Archived unused XML generator variants',
        'Comprehensive system documentation updates'
      ]
    }
  };
  
  fs.writeFileSync(
    path.join(PACKAGE_DIR, 'version-info.json'), 
    JSON.stringify(versionInfo, null, 2)
  );
  console.log('   ✅ Created version-info.json');
  
  // Create deployment script
  const deployScript = `#!/bin/bash
# Deployment script for Resgrid-ESO Bridge ${PACKAGE_VERSION}

echo "🚀 Deploying Resgrid-ESO Bridge ${PACKAGE_VERSION}..."

# Check if required files exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy .env.resgrid-bridge to .env and configure."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Validate environment
echo "🔍 Validating environment..."
node -e "
const { validateEnvironment } = require('./src/environment-validator');
try {
  validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}
"

# Start the service
echo "🎯 Starting Resgrid-ESO Bridge service..."
npm start
`;

  fs.writeFileSync(path.join(PACKAGE_DIR, 'deploy.sh'), deployScript);
  fs.chmodSync(path.join(PACKAGE_DIR, 'deploy.sh'), '755');
  console.log('   ✅ Created deploy.sh script');
  
  console.log(`\n📦 Deployment package ${PACKAGE_VERSION} created successfully!`);
  console.log(`📁 Location: ${PACKAGE_DIR}/`);
  console.log(`\n🚀 Ready for deployment with:`);
  console.log(`   - XML namespace compliance fixes`);
  console.log(`   - Enhanced logging with CallId context`);
  console.log(`   - Environment validation`);
  console.log(`   - Complete ChatGPT audit implementations`);
  
  return PACKAGE_DIR;
}

// Execute if run directly
if (require.main === module) {
  createDeploymentPackage();
}

module.exports = { createDeploymentPackage };