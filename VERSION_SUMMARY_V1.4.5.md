# Version 1.4.5 Summary

Release Date: May 10, 2025

## Updates
This version includes important XML content improvements and conditional logic enhancements:

### XML Content Improvements
1. **HTML Tag Stripping**
   - All text fields now have HTML tags automatically stripped
   - Removes `<p>`, `<div>`, and other HTML formatting from XML output
   - Ensures ESO receives clean, plain text data

2. **Conditional Patient Information**
   - Patient information fields (`PatientFirstName`, `PatientLastName`, `PatientDOB`) are now only included when "I am the patient" appears in the nature or note fields
   - Improves privacy by not including contact information unless explicitly indicated
   - Prevents unrelated contact information from being mistakenly included as patient data

### Google Sheets Integration
- Improved change detection for smarter sheet updates
- Added "Call Title" field extraction from Resgrid data
- Fixed health check server port conflict (changed from 8080 to 8081)

## Deployment Instructions
1. Download the deployment package: `resgrid-eso-bridge-deployment-v1.4.5.tar.gz`
2. Extract the package to your server
3. Update your `.env` file with your credentials
4. Deploy using Fly.io or your preferred hosting method

See `DEPLOYMENT.md` for detailed deployment instructions.

## Testing
The new HTML tag stripping and conditional patient information features should be tested with various call types to ensure proper behavior. Use the `test-xml-handling.js` script to verify these features are working as expected.