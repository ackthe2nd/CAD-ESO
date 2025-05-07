# Fingerprint Caching

The Resgrid to ESO Bridge implements a fingerprint caching mechanism to prevent redundant file uploads and optimize SFTP operations. This document explains how this feature works and provides recommendations for optimal use.

## Overview

Fingerprint caching is a technique that creates a unique identifier (fingerprint) for a file's content, then uses that identifier to determine if the file has changed before attempting to upload it. This approach offers several benefits:

- Reduces unnecessary SFTP operations
- Minimizes network bandwidth usage
- Decreases ESO system load
- Provides clearer audit trails
- Improves overall application performance

## Implementation Details

### Fingerprint Generation

The application uses SHA-256 hashing to create unique fingerprints for each file:

1. The file's contents are read into memory
2. A SHA-256 hash is calculated from the file content
3. This hash, combined with the remote path, forms a unique identifier for the file

### Caching Process

When a file is being considered for upload:

1. The system calculates the current fingerprint of the file
2. It checks if the same file+path combination has been uploaded before
3. If the fingerprint matches the previous upload, the file is skipped
4. If the fingerprint is different or no previous upload exists, the file is uploaded
5. After successful upload, the new fingerprint is stored for future reference

### Memory-Based Caching

The current implementation stores fingerprints in memory:

- Fingerprints are stored in a JavaScript Map object
- The key is a combination of local file path and remote destination path
- The value is the SHA-256 hash of the file's content
- The cache persists only for the current application session

## Usage in the Application

The fingerprint caching mechanism is integrated into the SFTP client (`src/sftp-client.js`) and provides the following functions:

### `hasFileChanged(localFilePath, remoteFilePath)`

Checks if a file has changed since the last upload by comparing fingerprints:

```javascript
const hasChanged = await hasFileChanged('local/path/file.xml', 'remote/path/file.xml');
if (hasChanged) {
  // Upload the file
} else {
  // Skip upload, file hasn't changed
}
```

### `clearFingerprintCache(filePath)`

Clears the fingerprint cache for a specific file or all files:

```javascript
// Clear cache for a specific file
clearFingerprintCache('local/path/file.xml');

// Clear entire cache
clearFingerprintCache();
```

### `uploadFileToSFTP(localFilePath, remoteFilePath)`

Uploads a file to SFTP only if it has changed:

```javascript
// This will automatically check if the file has changed before uploading
const result = await uploadFileToSFTP('local/path/file.xml', 'remote/path/file.xml');

// The result is true if the file was uploaded, false if it was skipped
if (result) {
  console.log('File was uploaded');
} else {
  console.log('File was skipped (no changes)');
}
```

## Logging

The system logs fingerprint caching activities to provide clear information about files being uploaded or skipped:

```
2025-05-06 10:15:23 [info]: File has not changed since last upload, skipping: incident_198513.xml
2025-05-06 10:16:45 [info]: File content has changed, uploading: incident_198514.xml
```

## Future Enhancements

Potential future enhancements to the fingerprint caching mechanism:

1. **Persistent Storage**: Store fingerprints in a local database or file to preserve them across application restarts
2. **Time-Based Expiry**: Implement cache expiration to ensure files are re-checked after a certain period
3. **Partial Content Checking**: For very large files, implement partial content checking for performance
4. **Compression Detection**: Intelligently handle files that may change in binary form but represent the same data (e.g., XML whitespace differences)

## Testing

The fingerprint caching mechanism can be tested using the provided test script:

```
node test-fingerprint-caching.js
```

This script validates that:
- Files are uploaded on the first attempt
- Unchanged files are skipped
- Modified files are uploaded
- Cache clearing works as expected

## Conclusion

The fingerprint caching mechanism significantly improves the efficiency of the Resgrid to ESO Bridge by eliminating redundant file uploads. This reduces system load, network traffic, and provides clearer operation logs while ensuring that all necessary data is still transmitted to ESO.