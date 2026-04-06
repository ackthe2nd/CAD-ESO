# Resgrid to ESO Bridge - API Endpoint Fix

This updated deployment package includes additional files to help troubleshoot and fix issues with the Resgrid API endpoints.

## New Files Added:

1. `fixed-fetch-existing-calls.js` - An improved version of fetch-existing-calls.js that uses the correct API endpoints:
   - Uses Calls/CallsByDateRange for historical calls 
   - Falls back to Calls/GetActiveCalls if needed
   - Includes better error handling and logging

2. `test-resgrid-calls-api.js` - A utility script to test which Resgrid API endpoints are accessible with your credentials:
   - Tests all documented Calls endpoints 
   - Identifies which endpoints work with your specific Resgrid account
   - Provides troubleshooting guidance

## How to Use:

### To test which Resgrid API endpoints work with your credentials:
```
node test-resgrid-calls-api.js
```

### To process recent calls using the fixed script:
```
node fixed-fetch-existing-calls.js --days=7
```

### To deploy to Fly.io:
```
# Deploy the updated package
fly deploy

# Or to deploy from a specific directory
fly deploy -c fly.toml
```

## If Problems Persist:

1. Check if your Resgrid account has the necessary API access permissions
2. Verify that your Resgrid instance supports the API endpoints being used
3. Contact Resgrid support for assistance with API access or endpoint availability