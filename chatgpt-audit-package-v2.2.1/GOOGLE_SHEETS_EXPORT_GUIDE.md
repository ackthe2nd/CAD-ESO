# Google Sheets Export Guide

This guide provides detailed information about the enhanced Google Sheets export features in the Resgrid-ESO Bridge application, focusing on the new XML verification capabilities.

## Enhanced Export Features

The `export-calls-to-sheets-enhanced.js` script offers several key features:

1. **Complete XML in Column D**: The full XML that would be sent to ESO is included directly in the Google Sheet, providing an easy way to verify format and content without accessing the server's filesystem.

2. **Automatic Sheet Creation**: The script automatically creates the 'Calls' sheet with proper headers if it doesn't exist, requiring zero manual setup.

3. **Intelligent Field Extraction**: Comprehensive parsing of address, geolocation, contact information, and unit status timestamps ensures all relevant data is properly logged.

4. **Command-line Control**: Flexible options allow you to specify exactly which calls to export.

## Usage Examples

### Basic Usage

```bash
# Export only active calls
node export-calls-to-sheets-enhanced.js --active

# Export calls from the last 7 days (default)
node export-calls-to-sheets-enhanced.js

# Export calls from the last N days
node export-calls-to-sheets-enhanced.js --days=14
```

### Example Output

The script will create a Google Sheet with the following columns:

| Timestamp | Call ID | Call Type | XML | Nature | Note | Address | City | State | Zip | ... |
|-----------|---------|-----------|-----|--------|------|---------|------|-------|-----|-----|
| 2025-05-06T11:51:40.984Z | 198513 | Medical | `<CadIncident>...</CadIncident>` | PERSON DOWN | Patient complaining of chest pain | 11401 Chalon Rd | Los Angeles | CA | 90049 | ... |

## XML Verification Benefits

Having the XML directly in the Google Sheet provides several advantages:

1. **Easy Verification**: Quickly verify the XML format and content without accessing server logs or files.

2. **Complete Audit Trail**: Maintain a historical record of all XML data sent to ESO for compliance and troubleshooting.

3. **Content Validation**: Ensures all required fields are properly populated in the XML structure.

4. **Accessibility**: Makes XML content accessible to stakeholders without technical knowledge or server access.

5. **Error Identification**: Quickly identify issues with specific fields by comparing raw data to the XML representation.

## Sheet Structure

The enhanced export creates a Google Sheet with these columns:

```
A: Timestamp
B: Call ID
C: Call Type
D: XML
E: Nature
F: Note
G: Address
H: City
I: State
J: Zip
K: Latitude
L: Longitude
M: Priority
N: Response Mode
O: Units
P: En Route Time
Q: Arrived Time
R: At Patient Time
S: Cleared Time
T: Patient First Name
U: Patient Last Name
V: Patient Phone
W: Patient DOB
```

## Implementation Details

### XML Generation

The XML content is generated using the `xmlbuilder2` library, with careful attention to formatting and structure:

```javascript
function generateCallXml(callData) {
  // Create the root element
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('CadIncident', { 'xmlns_xsi': 'http://www.w3.org/2001/XMLSchema-instance' });

  // Fixed GUID for all calls
  doc.ele('Guid').txt('b394de98-a5b7-408d-a1f2-020eddff92b9');
  
  // Add basic call data
  doc.ele('IncidentNumber').txt(callData.CallId || '');
  doc.ele('IncidentOrOnset').txt(callData.Timestamp || '');
  // ... additional fields ...
  
  // Convert to XML string with pretty formatting
  return doc.end({ prettyPrint: true });
}
```

### Sheet Creation

The script automatically creates and formats the 'Calls' sheet:

```javascript
// Add Calls sheet
const addSheetResponse = await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SPREADSHEET_ID,
  resource: {
    requests: [{
      addSheet: {
        properties: {
          title: 'Calls'
        }
      }
    }]
  }
});

// Get the new sheet ID from the response
const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;

// Add headers
await sheets.spreadsheets.values.update({
  spreadsheetId: SPREADSHEET_ID,
  range: 'Calls!A1:W1',
  valueInputOption: 'USER_ENTERED',
  resource: {
    values: [SHEET_HEADERS]
  }
});
```

## Troubleshooting

### Common Issues

1. **"Sheet1!A1:W1" errors**: 
   - This indicates the sheet name is incorrect. The script now uses 'Calls' instead of 'Sheet1'.
   - The fix is already implemented in v1.4.3.

2. **Missing XML content**:
   - Check that the XML generation function is working properly.
   - Ensure the XML content is being included in column D of the data array.

3. **"No grid with id" errors**:
   - This occurs when trying to format a sheet with an incorrect ID.
   - The fix is implemented in v1.4.3 by retrieving the sheet ID directly from the response.

### Verification Steps

To verify the export is working correctly:

1. Run `node export-calls-to-sheets-enhanced.js --active`
2. Open your Google Sheet
3. Check that the 'Calls' sheet exists
4. Verify XML content is present in column D
5. Check that all calls are correctly logged with timestamps

## Reference

For more information, see:
- [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md) - Complete Google Sheets integration documentation
- [FIELD_MAPPING_REFERENCE.md](FIELD_MAPPING_REFERENCE.md) - Field mapping details
- [VERSION_SUMMARY_V1.4.3.md](VERSION_SUMMARY_V1.4.3.md) - Summary of v1.4.3 updates