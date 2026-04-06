/**
 * Utility script to view XML files saved in the logs directory
 * 
 * Usage:
 *   node view-xml-logs.js          # Lists all XML files in logs directory
 *   node view-xml-logs.js --last   # Shows the most recent XML file
 *   node view-xml-logs.js --id=123 # Shows XML files for call ID 123
 */
const fs = require('fs');
const path = require('path');

// Configuration
const logsDir = path.join(__dirname, 'logs');

/**
 * Lists XML files in the logs directory
 */
function listXmlFiles() {
  if (!fs.existsSync(logsDir)) {
    console.log('Logs directory does not exist yet.');
    return [];
  }
  
  const files = fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.xml'))
    .map(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        created: stats.ctime,
        callId: extractCallId(file)
      };
    })
    // Sort by creation time (newest first)
    .sort((a, b) => b.created - a.created);
  
  return files;
}

/**
 * Extracts call ID from filename
 */
function extractCallId(filename) {
  // Try to extract call ID based on known naming patterns
  const patterns = [
    /incident_([^_\.]+)/, // Matches incident_123.xml or incident_123_timestamp.xml
    /test_incident_([^_\.]+)/, // Matches test_incident_123.xml or test_incident_123_timestamp.xml
    /call_([^_\.]+)/ // Matches call_123.xml or call_123_timestamp.xml
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return 'unknown';
}

/**
 * Displays a table of XML files
 */
function displayFileTable(files) {
  if (files.length === 0) {
    console.log('No XML files found.');
    return;
  }
  
  console.log(`\nFound ${files.length} XML files in logs directory:\n`);
  
  // Format for console.table
  const tableData = files.map((file, index) => ({
    '#': index + 1,
    'Call ID': file.callId,
    'Filename': file.name,
    'Size (KB)': (file.size / 1024).toFixed(2),
    'Created': file.created.toISOString()
  }));
  
  console.table(tableData);
}

/**
 * Displays the content of an XML file
 */
function displayXmlContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    console.log(`\n--------- ${filename} ---------\n`);
    console.log(content);
    console.log(`\n-------------------------------------\n`);
  } catch (error) {
    console.error(`Error reading XML file: ${error.message}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const showLast = args.includes('--last');
  const idArg = args.find(arg => arg.startsWith('--id='));
  const callId = idArg ? idArg.split('=')[1] : null;
  
  // Get list of XML files
  const xmlFiles = listXmlFiles();
  
  if (xmlFiles.length === 0) {
    console.log('No XML files found in logs directory.');
    return;
  }
  
  // Handle --last flag
  if (showLast) {
    console.log('Showing most recent XML file:');
    displayXmlContent(xmlFiles[0].path);
    return;
  }
  
  // Handle --id=X flag
  if (callId) {
    const matchingFiles = xmlFiles.filter(file => file.callId === callId);
    
    if (matchingFiles.length === 0) {
      console.log(`No XML files found for Call ID: ${callId}`);
      return;
    }
    
    console.log(`Found ${matchingFiles.length} XML files for Call ID: ${callId}`);
    
    // Show the most recent one
    displayXmlContent(matchingFiles[0].path);
    return;
  }
  
  // No special flags, just list all files
  displayFileTable(xmlFiles);
  console.log('\nTo view a specific file, use:');
  console.log('  node view-xml-logs.js --last   # Shows the most recent XML file');
  console.log('  node view-xml-logs.js --id=123 # Shows XML files for call ID 123');
}

// Run the script
main();