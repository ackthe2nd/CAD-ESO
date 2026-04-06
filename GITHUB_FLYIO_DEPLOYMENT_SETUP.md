# GitHub to Fly.io Deployment Setup

## Automated Deployment Configuration

The repository is now configured for automatic deployment to Fly.io via GitHub Actions.

### Setup Requirements

1. **GitHub Repository Setup**
   - Push code to GitHub repository
   - Add `FLY_API_TOKEN` as repository secret

2. **Fly.io API Token Setup**
   ```bash
   # Generate Fly.io API token
   fly auth token
   
   # Add to GitHub repository secrets:
   # Repository Settings > Secrets and variables > Actions
   # New repository secret: FLY_API_TOKEN
   ```

3. **Automatic Deployment Triggers**
   - Push to `main` branch
   - Manual workflow dispatch from GitHub Actions tab

### Deployment Workflow

The GitHub Action will:
1. Checkout latest code
2. Setup Fly.io CLI
3. Deploy to `resgrid2eso` app
4. Verify deployment status

### Manual Deployment

Alternative deployment methods:

```bash
# Local deployment
git push origin main  # Triggers automatic deployment

# Or manual trigger
gh workflow run deploy-flyio.yml
```

### Files Created for GitHub Deployment

- `.github/workflows/deploy-flyio.yml` - GitHub Actions workflow
- `README.md` - Repository documentation
- `.gitignore` - Git ignore patterns
- Fly.io deployment files in `flyio-update/`

### Production App Status

Current Fly.io app: `resgrid2eso`
Version: 2.1.6 (Call Closure Detection & Timestamp Formatting)

The deployment setup enables seamless updates to production whenever code changes are pushed to the main branch.