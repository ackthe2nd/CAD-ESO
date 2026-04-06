# Secrets Setup for Fly.io Deployment

## Required Secrets

Your application needs these secrets configured in Fly.io:

### 1. Resgrid API Credentials
```bash
fly secrets set RESGRID_USER="EMSadmin"
fly secrets set RESGRID_PASS="a1b2c3D*"
```

### 2. Google Service Account
```bash
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON='$(cat service-account.json)'
```

### 3. Google Sheets ID
```bash
fly secrets set LOG_SHEET_ID="your-google-sheet-id"
```

## Getting Your Google Service Account JSON

1. Go to Google Cloud Console
2. Create a service account with Google Sheets API access
3. Download the JSON key file
4. Use the complete JSON content as the secret value

## Finding Your Google Sheets ID

The Sheet ID is in your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

## Verification

After setting secrets, verify with:
```bash
fly secrets list
```

All secrets should show as "Set" without revealing values.