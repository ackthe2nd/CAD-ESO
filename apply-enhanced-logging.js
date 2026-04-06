/**
 * Apply Enhanced Logging with CallId Context
 * Updates all deployment packages with enhanced logging patterns
 */

const fs = require('fs');
const path = require('path');

// Find all deployment package directories
function findDeploymentPackages() {
  const packages = [];
  const files = fs.readdirSync('.');
  
  for (const file of files) {
    if (file.startsWith('deployment-package') && fs.statSync(file).isDirectory()) {
      packages.push(file);
    }
  }
  
  return packages;
}

// Apply enhanced logging patterns to index.js files
function applyEnhancedLogging() {
  console.log('🔧 Applying enhanced logging with CallId context...');
  
  const packages = findDeploymentPackages();
  let updatedFiles = 0;
  
  for (const packageDir of packages) {
    const indexPath = path.join(packageDir, 'src', 'index.js');
    
    if (fs.existsSync(indexPath)) {
      console.log(`\n📦 Processing ${packageDir}/src/index.js:`);
      
      try {
        let content = fs.readFileSync(indexPath, 'utf8');
        let changes = 0;
        
        // Apply enhanced logging patterns
        const patterns = [
          {
            search: /logger\.info\(`Received CallAdded event for Call ID: \$\{callData\.CallId\}`\)/g,
            replace: 'logger.info(`[Call ${callId}] Received CallAdded event`)',
            description: 'CallAdded event logging'
          },
          {
            search: /logger\.info\(`Processing call \$\{callData\.CallId\} directly`\)/g,
            replace: 'logger.info(`[Call ${callId}] Processing call directly`)',
            description: 'Direct processing logging'
          },
          {
            search: /logger\.info\(`Fetching extra data for Call ID: \$\{callData\.CallId\}`\)/g,
            replace: 'logger.info(`[Call ${callId}] Fetching extra data`)',
            description: 'Extra data fetching logging'
          },
          {
            search: /logger\.error\(`Failed to fetch extra data for Call ID: \$\{callData\.CallId\}`\)/g,
            replace: 'logger.error(`[Call ${callId}] Failed to fetch extra data`)',
            description: 'Extra data error logging'
          },
          {
            search: /logger\.info\(`No changes detected for call \$\{[^}]+\} - skipping processing/g,
            replace: 'logger.info(`[Call ${callId}] No changes detected - skipping processing',
            description: 'No changes logging'
          },
          {
            search: /logger\.info\(`Changes detected for call \$\{[^}]+\} - proceeding with processing/g,
            replace: 'logger.info(`[Call ${callId}] Changes detected - proceeding with processing',
            description: 'Changes detected logging'
          },
          {
            search: /logger\.info\(`First time processing call \$\{[^}]+\} - proceeding with processing/g,
            replace: 'logger.info(`[Call ${callId}] First time processing - proceeding with processing',
            description: 'First time processing logging'
          }
        ];
        
        // Apply each pattern
        for (const pattern of patterns) {
          const beforeCount = (content.match(pattern.search) || []).length;
          content = content.replace(pattern.search, pattern.replace);
          const afterCount = (content.match(new RegExp(pattern.replace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          
          if (beforeCount > 0) {
            console.log(`   ✅ Updated ${pattern.description}: ${beforeCount} instances`);
            changes += beforeCount;
          }
        }
        
        // Add callId variable definition if processCallAdded function exists
        if (content.includes('async function processCallAdded(callData)') && 
            !content.includes('const callId = callData.CallId;')) {
          content = content.replace(
            /async function processCallAdded\(callData\) \{\s*try \{/,
            `async function processCallAdded(callData) {
  try {
    const callId = callData.CallId;`
          );
          changes++;
          console.log('   ✅ Added callId variable definition');
        }
        
        // Add callId variable definition if processCallDirectly function exists
        if (content.includes('async function processCallDirectly(callData, callExtraData)') && 
            !content.includes('const callId = callData.CallId;')) {
          content = content.replace(
            /async function processCallDirectly\(callData, callExtraData\) \{\s*try \{/,
            `async function processCallDirectly(callData, callExtraData) {
  try {
    const callId = callData.CallId;`
          );
          changes++;
          console.log('   ✅ Added callId variable definition to processCallDirectly');
        }
        
        if (changes > 0) {
          fs.writeFileSync(indexPath, content);
          console.log(`   📝 Applied ${changes} enhancements to ${packageDir}`);
          updatedFiles++;
        } else {
          console.log('   ⚪ No changes needed (already enhanced)');
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing ${packageDir}: ${error.message}`);
      }
    } else {
      console.log(`   ⚪ ${packageDir} - src/index.js not found`);
    }
  }
  
  console.log(`\n📊 Summary: Enhanced ${updatedFiles} deployment packages`);
  console.log('✅ Enhanced logging implementation complete');
}

// Add environment validator to deployment packages
function addEnvironmentValidator() {
  console.log('\n🔍 Adding environment validator to deployment packages...');
  
  const packages = findDeploymentPackages();
  let addedValidators = 0;
  
  // Read the environment validator from src
  const validatorPath = 'src/environment-validator.js';
  if (!fs.existsSync(validatorPath)) {
    console.log('❌ Environment validator not found in src/');
    return;
  }
  
  const validatorContent = fs.readFileSync(validatorPath, 'utf8');
  
  for (const packageDir of packages) {
    const targetPath = path.join(packageDir, 'src', 'environment-validator.js');
    const indexPath = path.join(packageDir, 'src', 'index.js');
    
    if (fs.existsSync(indexPath)) {
      // Copy environment validator
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, validatorContent);
        console.log(`   ✅ Added environment-validator.js to ${packageDir}`);
        addedValidators++;
      }
      
      // Update index.js to include environment validation
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (!indexContent.includes('environment-validator')) {
        // Add import and validation call at the top
        const importPattern = /^(\/\*\*[\s\S]*?\*\/\s*)/;
        const match = indexContent.match(importPattern);
        
        if (match) {
          const headerComment = match[1];
          const restContent = indexContent.substring(match[1].length);
          
          const newContent = headerComment + 
            '\n// Validate environment before initializing anything else\n' +
            'const { validateAndExit } = require(\'./environment-validator\');\n' +
            'validateAndExit();\n\n' + 
            restContent;
          
          fs.writeFileSync(indexPath, newContent);
          console.log(`   ✅ Added environment validation to ${packageDir}/src/index.js`);
        }
      }
    }
  }
  
  console.log(`📊 Summary: Added environment validation to ${addedValidators} packages`);
}

// Main execution
if (require.main === module) {
  applyEnhancedLogging();
  addEnvironmentValidator();
}

module.exports = { applyEnhancedLogging, addEnvironmentValidator };