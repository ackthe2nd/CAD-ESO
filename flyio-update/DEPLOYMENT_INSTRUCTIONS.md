# Fly.io Production Deployment Instructions

## Version 2.1.6 - Call Closure Detection & Timestamp Formatting

### Prerequisites
1. Fly.io CLI installed on your local machine
2. Authenticated with your Fly.io account (`fly auth login`)
3. Access to the resgrid2eso app

### Deployment Steps

#### Option 1: Direct Deployment (Recommended)
```bash
# 1. Download the flyio-update folder to your local machine
# 2. Navigate to the flyio-update directory
cd flyio-update

# 3. Deploy to production
fly deploy --app resgrid2eso

# 4. Verify deployment
fly status --app resgrid2eso
fly logs --app resgrid2eso
```

#### Option 2: Docker Registry Deployment
```bash
# 1. Build Docker image
docker build -t resgrid-eso-bridge:v2.1.6 .

# 2. Tag for Fly.io registry
docker tag resgrid-eso-bridge:v2.1.6 registry.fly.io/resgrid2eso:latest

# 3. Login to Fly.io registry
fly auth docker

# 4. Push to registry
docker push registry.fly.io/resgrid2eso:latest

# 5. Deploy from registry
fly deploy --app resgrid2eso --image registry.fly.io/resgrid2eso:latest
```

### Post-Deployment Verification

#### 1. Check Application Status
```bash
fly status --app resgrid2eso
```
Expected: Status should show "running"

#### 2. Monitor Logs for New Features
```bash
fly logs --app resgrid2eso --follow
```
Look for:
- "Registered callback for CallAdded, CallClosed, CallStateChanged, and UnitStatusSet events"
- SignalR connection established
- Proper event handling

#### 3. Test Call Closure Detection
1. Create a test call in Resgrid
2. Close the call
3. Check logs for: "⚠️ RECEIVED CALL EVENT: CallClosed for call ID: [ID]"
4. Verify Google Sheets shows proper timestamp format

#### 4. Verify Health Endpoint
```bash
curl https://resgrid2eso.fly.dev/
```
Expected response:
```json
{
  "status": "OK",
  "service": "Resgrid-ESO Bridge",
  "timestamp": "2025-06-09T...",
  "version": "1.1.2"
}
```

### New Features Active After Deployment

1. **Real-time Call Closure Detection**
   - Instant detection via SignalR CallClosed events
   - Automatic final XML generation with closure data
   - No more reliance on polling for closure detection

2. **Readable Google Sheets Timestamps**
   - Format changed from: `2025-06-09T01:49:42.763`
   - To readable format: `6/9/2025 1:49:43`
   - Applied to Unit Dispatched Times and all timestamp fields

3. **Enhanced Unit Monitoring**
   - UnitStatusSet event monitoring
   - CallStateChanged processing
   - Improved call lifecycle tracking

### Rollback Plan (if needed)
```bash
# View deployment history
fly releases --app resgrid2eso

# Rollback to previous version if issues occur
fly releases rollback --app resgrid2eso
```

Your production system will immediately benefit from enhanced call closure detection and improved timestamp readability.