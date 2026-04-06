# Resgrid API Fix - Deployment Instructions

We've created a fixed version of the fetch-existing-calls.js script to properly work with the Resgrid API. This update includes:

1. Support for the correct API endpoints from the official Resgrid documentation
2. Fallback mechanisms when primary endpoints aren't available
3. Better error handling and diagnostics

## Files Available for Download

Two packages are available:

1. **Complete deployment package (93KB)**: `resgrid-eso-bridge-deployment-fixed.tar.gz`
   - Contains the complete application with the fixed scripts
   - Use this for a fresh installation or to completely replace your existing deployment

2. **Update-only package (7.2KB)**: `resgrid-eso-bridge-update.tar.gz`
   - Contains only the modified files
   - Use this to update an existing installation

## Deployment Options

### Option 1: Fresh Installation (Recommended)

1. Download `resgrid-eso-bridge-deployment-fixed.tar.gz`
2. Extract the contents: 
   ```
   tar -xzf resgrid-eso-bridge-deployment-fixed.tar.gz
   ```
3. Set up your environment variables in `.env`
4. Deploy using Fly.io:
   ```
   fly deploy
   ```

### Option 2: Update Existing Installation

1. Download `resgrid-eso-bridge-update.tar.gz`
2. Extract the update files into your existing installation:
   ```
   tar -xzf resgrid-eso-bridge-update.tar.gz -C /path/to/your/installation
   ```
3. Run the test script to check which endpoints work:
   ```
   node test-resgrid-calls-api.js
   ```
4. Process calls with the fixed script:
   ```
   node fixed-fetch-existing-calls.js --days=7
   ```

## Testing Your Installation

After deployment, test the API endpoints to verify which ones work in your environment:

```
node test-resgrid-calls-api.js
```

This will test all documented Resgrid API endpoints and show which ones are accessible with your credentials.

## Using the Fixed Script

Instead of using the original `fetch-existing-calls.js` script, use the fixed version:

```
node fixed-fetch-existing-calls.js --days=7
```

This script will:
1. Try the `Calls/CallsByDateRange` endpoint first (recommended in official docs)
2. Fall back to `Calls/GetActiveCalls` if the first endpoint isn't available
3. Provide more detailed logging about what's happening

## Fly.io Deployment

If you're deploying to Fly.io, follow these steps:

1. Make sure Fly CLI is installed
2. Set up your secrets:
   ```
   fly secrets set RESGRID_USER=your_username RESGRID_PASS=your_password
   ```
3. Deploy the application:
   ```
   fly deploy
   ```

Refer to the `DEPLOYING_TO_FLY_IO.md` document for more detailed deployment instructions.

## Troubleshooting

If you continue to experience issues after implementing these fixes:

1. Check if your Resgrid account has sufficient API permissions
2. Verify that your Resgrid instance provides access to the documented API endpoints
3. Contact Resgrid support to confirm which API endpoints are available for your account