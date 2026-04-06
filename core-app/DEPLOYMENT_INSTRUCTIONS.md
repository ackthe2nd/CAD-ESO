# Deployment Instructions for Resgrid on Fly.io

I've set up the deployment package for you in the `core-app` directory. Here's what I've done and how to proceed:

## What's Included

1. **Dockerfile**: Configured for building .NET 6.0 applications
2. **.dockerignore**: Optimizes Docker builds by excluding unnecessary files
3. **fly.toml**: Updated with your app name `core-ywjuqq`
4. **.env.example**: Template for required environment variables
5. **SETUP_AUTH.md**: Authentication configuration guide with your generated JWT secret
6. **DEPLOYMENT.md**: General deployment guidance

## Steps to Deploy

### 1. Copy Files to Your Resgrid Repository Root

First, copy all the files in this `core-app` directory to the root of your Resgrid repository.

### 2. Navigate to Your Repository Directory

```bash
cd path/to/your/resgrid/repo
```

### 3. Set Required Secrets in Fly.io

Set up your JWT authentication using the generated secret:

```bash
flyctl secrets set AuthConfig__JwtSecret="Xzb7KGSr9pHswxP7UKvLO8cMr5mLryR0gKGQqbUx9VM="
flyctl secrets set AuthConfig__JwtIssuer="Resgrid"
flyctl secrets set AuthConfig__JwtAudience="ResgridApi"
flyctl secrets set AuthConfig__JwtExpireMinutes="60"
```

### 4. Set Other Required Secrets

Set up your database connection and other required variables:

```bash
flyctl secrets set ConnectionStrings__ResgridContext="Your-DB-Connection-String"
# Add other secrets as needed from the .env.example file
```

### 5. Deploy to Fly.io

Now you can deploy with:

```bash
flyctl deploy
```

This command will:
- Build the Docker image using the Dockerfile
- Push it to Fly.io's registry
- Deploy your application

### 6. Monitor the Deployment

```bash
flyctl status
flyctl logs
```

## Troubleshooting

If you encounter deployment issues:

1. **Dockerfile not found error**: Make sure the Dockerfile is in the root directory of your repository
2. **Connection issues**: Check that all necessary environment variables and secrets are set
3. **Build failures**: Review the logs with `flyctl logs` for specific error messages

For more detailed information, see the included DEPLOYMENT.md file.

## Next Steps After Deployment

1. Access your deployed application at: https://core-ywjuqq.fly.dev
2. Create an initial admin user through the registration page
3. Configure your department settings
4. Add users and units to your system