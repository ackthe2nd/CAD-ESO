# Authentication Setup for New Resgrid Deployment

Since you're setting up a new deployment, here's how to configure the authentication settings:

## JWT Authentication Settings

For your new deployment, use these values:

```
AuthConfig__JwtSecret=Xzb7KGSr9pHswxP7UKvLO8cMr5mLryR0gKGQqbUx9VM=
AuthConfig__JwtIssuer=Resgrid
AuthConfig__JwtAudience=ResgridApi
AuthConfig__JwtExpireMinutes=60
```

The JWT secret has been generated securely using `openssl rand -base64 32` and is unique to your deployment.

## Setting These Values in Fly.io

Use these commands to set the JWT authentication values as secrets in your Fly.io deployment:

```bash
flyctl secrets set AuthConfig__JwtSecret="Xzb7KGSr9pHswxP7UKvLO8cMr5mLryR0gKGQqbUx9VM="
flyctl secrets set AuthConfig__JwtIssuer="Resgrid"
flyctl secrets set AuthConfig__JwtAudience="ResgridApi"
flyctl secrets set AuthConfig__JwtExpireMinutes="60"
```

## Additional Steps Required

1. **Database Setup**

   Make sure to create the necessary database tables for user authentication:
   
   ```bash
   # If using a tool like EF Core migrations
   dotnet ef database update --project Web/Resgrid.Web.Services
   ```

2. **Initial User**

   After deployment, you'll need to create an initial admin user. The easiest way is through the registration page once your application is running.

3. **Security Considerations**

   - Keep your JWT secret secure and do not share it
   - Consider rotating the JWT secret periodically for enhanced security
   - Set appropriate CORS policies in your application configuration

## Troubleshooting

If you encounter authentication issues:

1. Check that all secrets are correctly set in Fly.io
2. Verify that the database migration has created all authentication-related tables
3. Look for authentication-related errors in the logs: `flyctl logs`