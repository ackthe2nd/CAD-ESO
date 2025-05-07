# Setting Up Google Sheets Secret in Replit

This quick guide will help you set up your Google Sheets integration using Replit Secrets.

## Step 1: Get Your Google Service Account JSON File

If you don't already have one:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project if you don't have one
3. Enable the Google Sheets API
4. Create a service account
5. Download the JSON key file for the service account

## Step 2: Add the Secret to Replit

1. In your Replit project, click on the "Tools" icon in the sidebar
2. Select "Secrets" (looks like a lock icon)
3. Add a new secret:
   - Key: `GOOGLE_SERVICE_ACCOUNT_JSON`
   - Value: Copy and paste the **entire JSON content** of your service account key file
     - Open your JSON file in a text editor
     - Select all content (it should start with `{` and end with `}`)
     - Paste the complete JSON text (not the file path) as the secret value
     - Make sure it's valid JSON with no extra characters or line breaks
4. Add another secret:
   - Key: `LOG_SHEET_ID`
   - Value: Copy your Google Sheet ID from the URL (the long string between `/d/` and `/edit`)

## Step 3: Share Your Sheet with the Service Account

1. Open your Google Sheet
2. Click the "Share" button
3. Add the service account email as an Editor (found in the `client_email` field of your JSON file)
4. The email will look like: `something@project-id.iam.gserviceaccount.com`

## Step 4: Restart Your Application

1. Restart your application to use the new credentials
2. Check the logs to verify the Google Sheets integration is working

## Sample Format for Testing

You can test your connection by adding this service account JSON to your Replit Secrets:

```json
{
  "type": "service_account",
  "project_id": "example-project-123456",
  "private_key_id": "abcdef1234567890abcdef1234567890abcdef12",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/xEYV8ifTc4NO\nJOjnZq1zDUWfLr1SBMgvUZTy2icaf/fFO5ZQ5OO0guxVj/AlaZWfyQNsvaffPebP\nsZnNDbyYHsa4sRPoWDkQJANrU6w4RONtlCKg4e3MlI5QZHnLT0t7Z9FRaWD+nkVY\nGJ8kpDmv+AvTWjNkU7PrdHfcjyndo/CBC3BlA9ZQ79tHa9BBo0Mm2ggHhRHRgE9z\nRCBibuMH6I0Yvl70iyKvD1OZOUimd//XvoBnSz1jc7tkZt31cHCd7cLI3KaQZvTL\nCKGGARwomYk5ju3WJ1PSjEcpl27bRCnbSTpOZguokkYUOXdoqZFRLfbifH73LUKER\narKYjmP5AgMBAAECggEAXRj1aSuBefCVpcVbOQ7WGSW9TJf9t3GaLdrIA2My38sH\nxqM3N/Fc5Htq4Z7mg9qB2bC5P+FLWVpbkTHYyWbbsosQLJrlZkO8ebQRLEy+tgpZ\nLa+jZS6EqEfK5yd0fl0bN9dsbq7x7Z7erKtTAL6daUWzWE0lWTjRj/ja6PK9L8NR\nMnAAGroPYiZh3j6Z5MfUxd598qJuizl7ybwN3gywpOl65MOyFAcPj9BhiYspnki\nMTBorT2XshLezZnLQZveKnBcUFY5SzMxIgAM1q9avWdZxEDW5AKuFNed0Emu5uM\nwgkvcQtaQi+ItUtTMHwPH5Cbx/Un7ZdtxB72GvOTQQKBgDNUjE/Mxc+73tqjgGX8\nhYfsdXZ9XGQQwo9i7i4O9lGNEeecJIj/b7xPXoGiAV92oZqyazDT2RWQox8LZTKJ\nTjkEIBo5PgyZeA6P0Pu24Zg6P/n4UKDrEkSN4d0p09mHEhxR+7TlDJfh8+r8kB+N\noCktbBxCQsUWG0nBUzxBZYhJAoGBAO1qQ0cSgMIVISKvlHTpPnKEGGRSUGDrGzt0\nZW3okTK1GYJ4GMAHu1lr6kIcj+WZNHlQnWlw9Jhz9hPJuAQsGFzDRvBdgkr8uMcT\nhLSgO95ckii44QoD/kbLKxnFk66RGCTu7r0N58d0C4IWdtqO3I5/IQ1YZQcJ7cUQ\nejCw/GshAoGALgF+aaTJk4JSRlXOkWKnJw1IsPrZFrDfz8j3A1NepVEb3Qvf9y/k\nx1Kn1HdtZMz26yAJfWjCkjWoXCfAvjxOOLuFQC1o6Tv3F/oI3+YoCXZ3d1q8pIAm\n1jvb2CdcV4oPjQcCaDaYM4oNFb5zLwCc4HhpCjmtA9gBb3Wt7m4pNYkCgYAo2mV0\n0DwwGVtfli8OkMFexL9+q7CIRLR7/UHdYNmW0ZuBuOVhM5Z42HeIkPYbXKBsLf3j\nR9aOAoX2MKHcW8LMtwJoFzypYcUa0aJytTm0q45LJoLKnvP6QPB8D++LWL3XQmVS\ngB8yAtWjZ5G1qUMNJUyEzyFiJOOFLKHoSPSDYQKBgCpcpxsJYlB2nsXCgQy1aKDV\nCHuTHXdgCYCzpP5pJT5HYlLhuStXk0NM/gE70YgXKY3MZIXOJqqWF7i7e7q9+a4b\nO7p+W2qG1mVUZL0L+1OdDkjVQBmBnj0k1j3QPjXIvzQCHiwGvLLPbBKaIU6fK6o9\nFCfLx9VkxLhWfCHBvFVw\n-----END PRIVATE KEY-----\n",
  "client_email": "example-sa@example-project-123456.iam.gserviceaccount.com", 
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/example-sa%40example-project-123456.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

**IMPORTANT NOTE**: This is just a sample for format verification. You'll need to use your real service account JSON in production, as this sample will not work with real Google APIs.

## Troubleshooting

If you encounter issues:

1. Make sure you've copied the ENTIRE JSON file contents, including the opening and closing braces.
2. Verify your sheet ID is correct and the service account has access to it.
3. Check that the Google Sheets API is enabled for your Google Cloud project.
4. Look for detailed error messages in your application logs.

For more details, see the [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md) documentation.