# Cloud Deployment Secrets Configuration

## Fly.io Secrets Setup

### Required Environment Variables
Set these secrets in your Fly.io deployment:

```bash
# Resgrid API Credentials
flyctl secrets set RESGRID_USER="your_resgrid_username"
flyctl secrets set RESGRID_PASS="your_resgrid_password"

# Google Sheets Integration
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'
flyctl secrets set LOG_SHEET_ID="1AbC123dEf456GhI789jKl"

# ESO SFTP Configuration
flyctl secrets set SFTP_HOST="sftp.esosuite.net"
flyctl secrets set SFTP_USER="your_eso_username" 
flyctl secrets set SFTP_PASS="your_eso_password"
flyctl secrets set SFTP_DIR="/your-eso-directory-path"
```

### Verification Commands
```bash
# List all secrets
flyctl secrets list

# Check specific secret
flyctl secrets get SFTP_HOST
```

## GitHub Deployment Secrets

### Repository Secrets
Add these in GitHub repository settings > Secrets and variables > Actions:

```
RESGRID_USER
RESGRID_PASS
GOOGLE_SERVICE_ACCOUNT_JSON
LOG_SHEET_ID
SFTP_HOST
SFTP_USER
SFTP_PASS
SFTP_DIR
```

### GitHub Actions Workflow
```yaml
name: Deploy to Fly.io
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: |
          flyctl secrets set RESGRID_USER="${{ secrets.RESGRID_USER }}"
          flyctl secrets set RESGRID_PASS="${{ secrets.RESGRID_PASS }}"
          flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON="${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}"
          flyctl secrets set LOG_SHEET_ID="${{ secrets.LOG_SHEET_ID }}"
          flyctl secrets set SFTP_HOST="${{ secrets.SFTP_HOST }}"
          flyctl secrets set SFTP_USER="${{ secrets.SFTP_USER }}"
          flyctl secrets set SFTP_PASS="${{ secrets.SFTP_PASS }}"
          flyctl secrets set SFTP_DIR="${{ secrets.SFTP_DIR }}"
          flyctl deploy
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Docker Deployment Secrets

### Environment File (.env)
```bash
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
LOG_SHEET_ID=1AbC123dEf456GhI789jKl
SFTP_HOST=sftp.esosuite.net
SFTP_USER=your_eso_username
SFTP_PASS=your_eso_password
SFTP_DIR=/your-eso-directory-path
```

### Docker Run Command
```bash
docker run -d --env-file .env your-image-name
```

## AWS/GCP/Azure Deployment

### AWS Systems Manager
```bash
aws ssm put-parameter --name "/resgrid/RESGRID_USER" --value "username" --type "SecureString"
aws ssm put-parameter --name "/resgrid/RESGRID_PASS" --value "password" --type "SecureString"
```

### Google Cloud Secret Manager
```bash
gcloud secrets create resgrid-user --data-file=username.txt
gcloud secrets create resgrid-pass --data-file=password.txt
```

### Azure Key Vault
```bash
az keyvault secret set --vault-name "resgrid-vault" --name "resgrid-user" --value "username"
az keyvault secret set --vault-name "resgrid-vault" --name "resgrid-pass" --value "password"
```

## Security Best Practices

### Secret Management
- Never commit secrets to version control
- Use environment-specific secrets
- Rotate credentials regularly
- Monitor secret access logs

### Access Control
- Limit secret access to deployment pipelines only
- Use service accounts with minimal permissions
- Enable audit logging for secret access
- Implement secret rotation policies

## Troubleshooting

### Common Issues
- **Invalid JSON**: Ensure Google Service Account JSON is properly escaped
- **Missing Variables**: Verify all required secrets are set
- **Permission Errors**: Check service account permissions
- **Connection Failures**: Validate SFTP credentials and network access

### Debug Commands
```bash
# Test SFTP connection
node scripts/test-cloud-sftp.js

# Verify environment variables
flyctl ssh console -C "env | grep RESGRID"

# Check application logs
flyctl logs --app your-app-name
```

## Production Checklist

- [ ] All secrets configured in deployment platform
- [ ] Service account permissions verified
- [ ] SFTP credentials tested
- [ ] Google Sheets access confirmed
- [ ] Network connectivity validated
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures documented

Ready for secure cloud deployment with proper secret management.