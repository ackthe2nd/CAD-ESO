# XML Format Updates

Based on ESO requirements, the following updates have been made to the XML format:

## Required Changes

1. **Removed Fields**
   - `<Guid>` - Removed entirely
   - `<ComplaintReportedByDispatch>` - Removed entirely
   - `<VehicleDispatchLocation>` - Removed entirely
   - `<PatientPhone>` - Removed entirely

2. **Address Formatting**
   - `<IncidentAddress1>` - Now contains only the street address (street prefix, number, name, type and suffix)
   - Example: Changed from `11401 Chalon Rd, Los Angeles, CA 90049, USA` to `11401 Chalon Rd`

3. **Date/Time Formatting**
   - `<UnitNotifiedByDispatch>` - Now formatted as a proper DateTime field when the Unit is dispatched
   - `<PatientDOB>` - Now formatted as YYYY-MM-DD (e.g., `2000-01-01`)

## Content Formatting (v1.4.5)

1. **HTML Tag Stripping**
   - All text fields now have HTML tags automatically stripped
   - Removes `<p>`, `<div>`, and other HTML formatting tags from XML output
   - Example: Changed from `<p>nature of the call</p>` to `nature of the call`
   
2. **Conditional Patient Information**
   - Patient information fields (`PatientFirstName`, `PatientLastName`, `PatientDOB`) are now only included when "I am the patient" appears in the nature or note fields
   - If not explicitly indicated as patient, these fields will be empty
   - Prevents unrelated contact information from being transmitted to ESO

## Implementation Details

These changes have been implemented in:
1. `src/xml-generator.js` - The main XML generator for the real-time listener
2. `export-calls-to-sheets-enhanced.js` - The enhanced Google Sheets export utility
3. `test-xml-handling.js` - Testing script for HTML stripping and conditional patient info

## Additional Notes

- The DateTime format is using local time as required by ESO (not UTC)
- The DOB formatting includes validation to ensure proper YYYY-MM-DD format
- The address parsing has been enhanced to extract only the street portion
- HTML tag stripping is performed via a regex pattern to remove all HTML tags
- Patient info conditional check examines both nature and note fields for "I am the patient" phrase