# Version 1.4.4 Summary

Release Date: May 9, 2025

## Updates
This version includes important XML format updates based on ESO requirements:

### XML Format Updates
1. **Removed Fields**
   - `<Guid>` removed entirely
   - `<ComplaintReportedByDispatch>` removed entirely
   - `<VehicleDispatchLocation>` removed entirely
   - `<PatientPhone>` removed entirely

2. **Address Formatting**
   - `<IncidentAddress1>` now contains only the street address portion (no city/state/zip)

3. **Field Format Corrections**
   - `<UnitNotifiedByDispatch>` is now properly formatted as a DateTime
   - `<PatientDOB>` is now properly formatted as YYYY-MM-DD

### Added Documentation
- Added `XML_FORMAT_UPDATES.md` with details on all XML format changes

## Deployment Instructions
1. Download the deployment package: `resgrid-eso-bridge-deployment-v1.4.4.tar.gz`
2. Extract the package to your server
3. Update your `.env` file with your credentials
4. Deploy using Fly.io or your preferred hosting method

See `DEPLOYMENT.md` for detailed deployment instructions.

## Testing
The XML format changes should be thoroughly tested with ESO to ensure compatibility.
Use the `export-calls-to-sheets-enhanced.js` script to view the generated XML in Google Sheets 
(column D) and verify the format is correct.