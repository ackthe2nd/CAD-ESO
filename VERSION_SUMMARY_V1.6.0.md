# Version Summary - v1.6.0

## New Features

### Multiple Units Support
- Automatic detection of calls with multiple units
- Nested XML structure for multiple units using `<Units>` wrapper
- Individual unit timestamps and information
- Backward compatibility maintained for single-unit calls

### Enhanced Unit Processing
- Improved unit extraction from Dispatches array
- Individual timestamp processing for each unit
- Better fallback handling for missing data

### XML Generation Improvements
- Dynamic XML structure based on unit count
- Proper unit-specific timestamp assignment
- Maintained field mapping consistency

## Technical Improvements

### Data Structure Handling
- Enhanced unit object creation and management
- Improved activity array processing for multiple units
- Better error handling for edge cases

### Testing
- Comprehensive test suite for multiple units functionality
- Validation for both single and multiple unit scenarios
- XML structure verification

## Files Changed

- `src/xml-generator.js`: Added multiple units support
- `test-multiple-units-xml.js`: New test file for validation
- `MULTIPLE_UNITS_FEATURE.md`: Feature documentation

## Deployment Notes

This version maintains full backward compatibility while adding support for multiple units per incident. No configuration changes required - the system automatically detects and handles multiple units appropriately.

## Version History

- v1.6.0: Multiple units support with nested XML structure
- v1.5.0: XML consistency fixes and GPS coordinate extraction  
- v1.4.9: Google Sheets integration improvements
- v1.4.8: Enhanced logging and error recovery
- v1.4.7: XML field updates and status monitoring