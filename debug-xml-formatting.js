/**
 * Debug script to check XML formatting
 */
const fs = require('fs');
const path = require('path');

function main() {
  console.log('Debugging XML formatting issues...');
  
  // Read the problematic XML file
  const xmlPath = path.join(__dirname, 'logs', 'call_198424_exact_match.xml');
  if (!fs.existsSync(xmlPath)) {
    console.error(`XML file not found: ${xmlPath}`);
    return;
  }
  
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  
  // Look for specific formatting issues
  console.log('\nChecking for common XML formatting problems:');
  
  // Check for IncidentAddress1 formatting
  const addressMatch = xmlContent.match(/<\/(\w+)>>([^<]+)/);
  if (addressMatch) {
    console.log(`\nPROBLEM DETECTED: Malformed tag after </${addressMatch[1]}>>`);
    console.log(`Text content: "${addressMatch[2]}"`);
    console.log(`\nFix suggestions:`);
    console.log(`1. Change: </IncidentAddress1>>${addressMatch[2]}`);
    console.log(`   To:    <IncidentAddress1>${addressMatch[2]}</IncidentAddress1>`);
  } else {
    console.log('No malformed closing tags detected.');
  }
  
  // Check for missing tags
  const openTag = xmlContent.match(/<(\w+)[^>]*>(?![\s\S]*<\/\1>)/g);
  if (openTag && openTag.length > 0) {
    console.log('\nPROBLEM DETECTED: Open tags without matching closing tags:');
    openTag.forEach(tag => console.log(`- ${tag}`));
  }
  
  // Check for improper nesting
  console.log('\nAnalyzing XML structure:');
  const lines = xmlContent.split('\n');
  let depth = 0;
  let structure = [];
  
  lines.forEach((line, index) => {
    if (line.includes('</') && !line.includes('</'+'IncidentAddress1>>')) {
      depth--;
    }
    
    if (line.includes('<') && !line.includes('</') && !line.includes('?>')) {
      structure.push({
        indent: depth,
        line: line.trim(),
        lineNum: index + 1
      });
      depth++;
    }
  });
  
  // Display structure
  console.log('XML structure with indentation:');
  structure.forEach(item => {
    console.log(`${' '.repeat(item.indent * 2)}[Line ${item.lineNum}] ${item.line}`);
  });
  
  // Check for the VehicleDispatchLocation tag
  if (xmlContent.includes('<VehicleDispatchLocation>') && xmlContent.includes('</VehicleDispatchLocation>')) {
    console.log('\nVehicleDispatchLocation tag found in the XML.');
  }
  
  // Display the section around the problematic area
  if (addressMatch) {
    const problematicLine = addressMatch.input.split('\n').findIndex(line => line.includes(addressMatch[0]));
    if (problematicLine >= 0) {
      console.log('\nContext around the problematic area:');
      const start = Math.max(0, problematicLine - 2);
      const end = Math.min(lines.length, problematicLine + 3);
      
      for (let i = start; i < end; i++) {
        if (i === problematicLine) {
          console.log(`>>> ${lines[i]} <<<`);
        } else {
          console.log(`    ${lines[i]}`);
        }
      }
    }
  }
}

main();