# Version 1.4.6 - Unit Name Handling Update

## Overview

Version 1.4.6 introduces significant improvements to unit name handling in the Resgrid-to-ESO Bridge. This update ensures that unit names (like "STN1", "BLS11") rather than unit IDs (like "8826", "8827") are properly included in the XML output sent to ESO.

## Key Changes

- **Enhanced Unit Name Extraction**: The system now properly extracts unit names from the Dispatches array in call data
- **Multiple Unit Support**: The XML generator now correctly handles multiple units assigned to a call
- **Improved XML Output**: The EmsUnitCallSign field now displays actual unit names instead of numeric IDs
- **Robust Data Path Handling**: Fixed path access for different API response structures
- **Backward Compatibility**: Added fallback mechanisms to handle various API response formats

## Technical Details

- Updated data path access to properly navigate to `Data.Dispatches` in the API response
- Added multiple ways to extract unit names from different parts of the response
- Modified activity tracking to use unit names instead of IDs when matching status timestamps
- Added support for both `Name` and `UnitName` fields in unit activity records
- Fixed debug logging to accurately show unit name extraction

## Deployment Notes

This update is backward compatible with existing systems and requires no configuration changes. To deploy:

1. Upload the updated files to your server
2. Restart the service to apply the changes
3. Verify unit names appear correctly in both XML and Google Sheets logs

## Files Changed

- `src/xml-generator.js` - Updated to properly handle unit names

## Testing

The update has been tested with calls containing both single and multiple unit assignments. All timestamps and unit details are correctly extracted and included in the XML output.