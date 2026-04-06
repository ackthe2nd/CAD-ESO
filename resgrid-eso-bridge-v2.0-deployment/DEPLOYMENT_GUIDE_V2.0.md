# Deployment Guide v2.0
**Resgrid-ESO Bridge Production Deployment**

This guide covers deployment of the enhanced Resgrid-ESO Bridge with test functionality and comprehensive monitoring.

## Pre-Deployment Checklist

### System Test Validation
Run the comprehensive system test to verify all components:
```bash
node system-test-comprehensive.js
```

Expected output: **8/8 components passing**
- Authentication Systems ✅
- Resgrid API Endpoints ✅  
- Google Sheets Integration ✅
- SFTP Connection ✅
- XML Generation ✅
- Test Endpoints ✅
- Duplicate Prevention ✅
- Pacific Time Consistency ✅

### Environment Variables
Verify all required environment variables are configured:

```bash
# Required for all deployments
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_DIR=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
LOG_SHEET_ID=your_google_sheets_id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Optional SFTP settings
SFTP_PASSWORD=fallback_sftp_password
```

## Fly.io Deployment (Recommended)

### Step 1: Install Fly.io CLI
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login
```

### Step 2: Deploy Application
```bash
# Deploy with automatic secrets management
flyctl deploy --app resgrid2eso

# Verify deployment
flyctl status --app resgrid2eso
```

### Step 3: Configure Secrets
```bash
# Set environment variables as secrets
flyctl secrets set RESGRID_USER="your_username" --app resgrid2eso
flyctl secrets set RESGRID_PASS="your_password" --app resgrid2eso
flyctl secrets set LOG_SHEET_ID="your_sheet_id" --app resgrid2eso
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --app resgrid2eso
```

### Step 4: Verify Deployment
```bash
# Check health endpoint
curl https://resgrid2eso.fly.dev/health

# Expected response:
{
  "status": "OK",
  "service": "Resgrid-ESO Bridge",
  "timestamp": "2025-06-09T02:30:00.000Z",
  "version": "2.0"
}
```

### Step 5: Test New Features
```bash
# Test call processing endpoint
curl https://resgrid2eso.fly.dev/test/201192

# Expected: JSON response with test results
```

## Docker Deployment

### Step 1: Build Image
```bash
# Build Docker image
docker build -t resgrid-eso-bridge:v2.0 .

# Tag for registry
docker tag resgrid-eso-bridge:v2.0 your-registry/resgrid-eso-bridge:v2.0
```

### Step 2: Run Container
```bash
# Run with environment file
docker run -d \
  --name resgrid-eso-bridge \
  --env-file .env \
  -p 5000:5000 \
  --restart unless-stopped \
  resgrid-eso-bridge:v2.0
```

### Step 3: Verify Container
```bash
# Check container status
docker ps | grep resgrid-eso-bridge

# Check logs
docker logs resgrid-eso-bridge

# Test health endpoint
curl http://localhost:5000/health
```

## Google Cloud Run Deployment

### Step 1: Prepare for Cloud Run
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/resgrid-eso-bridge:v2.0

# Deploy to Cloud Run
gcloud run deploy resgrid-eso-bridge \
  --image gcr.io/your-project/resgrid-eso-bridge:v2.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000
```

### Step 2: Configure Environment Variables
```bash
# Set environment variables
gcloud run services update resgrid-eso-bridge \
  --set-env-vars RESGRID_USER="your_username" \
  --set-env-vars RESGRID_PASS="your_password" \
  --set-env-vars LOG_SHEET_ID="your_sheet_id" \
  --region us-central1
```

## Local Development Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Step 3: Run Development Server
```bash
# Start with hot reload
npm run dev

# Or start production mode
npm start
```

### Step 4: Run Tests
```bash
# Run system tests
npm test

# Test specific call
node test-call-functionality.js 201192
```

## Post-Deployment Verification

### Step 1: Health Check
```bash
# Verify service is running
curl https://your-domain/health

# Should return 200 OK with service info
```

### Step 2: Google Sheets Integration
1. Open your Google Sheets log
2. Verify "Test Call" column has clickable buttons
3. Click a test button to verify functionality
4. Check "Test Result" column updates in real-time

### Step 3: SFTP Connection Test
```bash
# Run SFTP connectivity test
node -e "
const test = require('./system-test-comprehensive.js');
const tester = new test();
tester.testSftpConnection().then(() => console.log('SFTP test complete'));
"
```

### Step 4: End-to-End Test
1. Trigger a test call from Resgrid (or use existing active call)
2. Verify XML generation and SFTP upload
3. Check Google Sheets logging
4. Confirm test buttons work correctly

## Monitoring & Maintenance

### Health Monitoring
Set up automated health checks:
```bash
# Add to cron for regular health checks
*/5 * * * * curl -f https://your-domain/health || echo "Service down" | mail admin@domain.com
```

### Log Monitoring
Monitor Google Sheets logs for:
- SFTP upload failures
- Authentication errors
- XML generation issues
- Test execution results

### Performance Monitoring
Track key metrics:
- API response times (~500ms target)
- Google Sheets update speed (~300ms target)
- SFTP upload success rate (98% target)
- Test execution time (3-5 seconds target)

## Rollback Procedures

### Emergency Rollback
```bash
# Fly.io rollback to previous version
flyctl releases --app resgrid2eso
flyctl rollback --app resgrid2eso --version v123

# Docker rollback
docker stop resgrid-eso-bridge
docker run -d --name resgrid-eso-bridge-backup \
  --env-file .env -p 5000:5000 \
  resgrid-eso-bridge:v1.8.0
```

### Gradual Rollback
1. Deploy previous version alongside current
2. Route traffic gradually using load balancer
3. Monitor for issues before full rollback

## Troubleshooting Common Issues

### Test Endpoints Not Working
**Symptoms**: Test buttons return "Not Found"
**Solution**: 
```bash
# Redeploy with latest changes
flyctl deploy --app resgrid2eso

# Verify test endpoint
curl https://resgrid2eso.fly.dev/test/201192
```

### Google Sheets Test Buttons Missing
**Symptoms**: Test Call column shows text instead of buttons
**Solution**:
```bash
# Run button repair script
node -e "
const { google } = require('googleapis');
// Script to recreate test buttons with HYPERLINK formulas
"
```

### SFTP Connection Issues
**Symptoms**: Upload failures in logs
**Solution**:
```bash
# Test SFTP connectivity
node system-test-comprehensive.js
# Check SFTP credentials and network connectivity
```

### Authentication Failures
**Symptoms**: 401 errors in Resgrid API calls
**Solution**:
```bash
# Refresh Resgrid credentials
flyctl secrets set RESGRID_USER="updated_username" --app resgrid2eso
flyctl secrets set RESGRID_PASS="updated_password" --app resgrid2eso
```

## Security Considerations

### Environment Variables
- Store all secrets as environment variables, never in code
- Use platform-specific secret management (Fly.io secrets, Docker secrets)
- Rotate credentials regularly

### Network Security
- Use HTTPS for all external communications
- Verify SFTP SSL/TLS certificates
- Implement IP whitelisting if possible

### Access Control
- Limit Google Sheets access to service account only
- Use least-privilege principle for all integrations
- Monitor access logs regularly

## Performance Optimization

### Resource Allocation
- **CPU**: 1 core minimum, 2 cores recommended
- **Memory**: 512MB minimum, 1GB recommended
- **Storage**: 10GB for logs and temporary files

### Scaling Considerations
- Single instance sufficient for current load
- Consider horizontal scaling for high-volume deployments
- Monitor resource usage and scale accordingly

### Caching Strategy
- Cache Resgrid API tokens for 1 hour
- Implement Google Sheets API rate limiting
- Use connection pooling for SFTP connections

---

**Deployment Version**: 2.0  
**Target Platform**: Fly.io (Primary), Docker (Secondary)  
**Estimated Deployment Time**: 15-30 minutes  
**Required Downtime**: < 5 minutes (rolling deployment)