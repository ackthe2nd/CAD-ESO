# Updated Features

## 1. Fixed Unit Name Deduplication

- **Problem:** In previous versions, when multiple units of the same name were attached to a call, the XML would show duplicate unit names (e.g., "STN1, STN1").
- **Solution:** Implemented proper deduplication using JavaScript's `Set` object.
- **Files Fixed:**
  - `final-with-sheets-fix.js` - Both in XML generation and Google Sheets logging

## 2. Added Google Sheets Row Updates and Timestamps

- **Problem:** Previously, each time a call was processed, a new row was added to the Google Sheets log, even if the call already existed in the sheet.
- **Solution:**
  - Added logic to first check if a call ID already exists in the sheet
  - If found, update the existing row instead of creating a new one
  - Added a "Last Updated" timestamp column to track when records were last updated
  - Provides a fallback to append method if check/update fails
- **Files Fixed:**
  - `src/sheets-logger.js` - Updated to support row updates and timestamps
  - `final-with-sheets-fix.js` - Added the same functionality

## 3. Fixed Missing Units in Google Sheets

- **Problem:** Some calls showed "No Units" in the Google Sheets export even when there were units attached to the call.
- **Solution:** Enhanced code to look for units in both places where Resgrid stores them:
  - In the `Activity` array (for units that have recorded status updates)
  - In the `Dispatches` array (for units initially assigned to a call)
- **Implementation:**
  - Modified `fetchCallExtraData` to return both activity and dispatches data
  - Updated `processCall` to properly handle and store both types of data
  - Enhanced unit gathering in both `logCallData` and `generateXML` functions
  - Added detailed logging to track where units are coming from
- **Files Fixed:**
  - `final-with-sheets-fix.js` - Updated all relevant functions

## 4. Improved Unit Time Extraction

- **Problem:** Original code had trouble extracting the correct unit status times from Resgrid data.
- **Solution:** Uses StatusId values directly (5=En Route, 6=On Scene, etc.) instead of relying on text matching.
- **Details:**
  - StatusId 5: En Route
  - StatusId 6: On Scene
  - StatusId 7: At Patient
  - StatusId 8: Cleared
  - StatusId 9: Returning
  - StatusId 2: Available
  
## 5. Enhanced Status Fallback Logic

- **Problem:** Some calls don't have all status events, leading to missing times in ESO.
- **Solution:** Improved fallback logic to handle cases where the same status applies to both "Cleared" and "Back In Service" fields.
- **Logic:**
  - For "Cleared" time: Try StatusId 8 → StatusId 9 → StatusId 2 → call.ClosedOn
  - For "Back In Service" time: Try StatusId 9 → StatusId 2 → StatusId 8

## Deployment Information

The updated deployment package is available as `resgrid-eso-bridge-deployment-final-fixed.tar.gz` and contains all these improvements.

## XML File Storage

- XML files are first saved locally to `incident_{CallId}.xml`
- If SFTP credentials are configured, files are uploaded to the ESO SFTP server at `/incoming` (or configured path)
- After successful upload, local files are deleted
- If SFTP is not configured, files remain saved locally