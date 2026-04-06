/**
 * Verify Duplicate Upload Fix
 * Tests that the stable hash excludes volatile metadata fields
 */

require('dotenv').config();
const { getApiToken } = require('./src/token-manager');
const { getCallExtraData } = require('./src/resgrid-api');

/**
 * Creates a stable hash excluding volatile metadata fields
 */
function createStableHash(callExtraData) {
  if (!callExtraData) return '';
  
  // Create a copy excluding volatile fields that change on every API call
  const stableData = { ...callExtraData };
  
  // Remove volatile metadata fields that change with each API request
  delete stableData.Timestamp;
  delete stableData.RequestId;
  delete stableData.Version;
  delete stableData.Node;
  delete stableData.Environment;
  delete stableData.PreviousPageUrl;
  delete stableData.NextPageUrl;
  delete stableData.PageSize;
  delete stableData.Page;
  delete stableData.Status;
  
  // Create hash from stable data only
  return JSON.stringify(stableData).replace(/\s/g, '');
}

/**
 * Creates the old unstable hash that included volatile fields
 */
function createUnstableHash(callExtraData) {
  return callExtraData ? JSON.stringify(callExtraData).replace(/\s/g, '') : '';
}

async function verifyDuplicateUploadFix() {
  console.log('Verifying Duplicate Upload Fix');
  console.log('==============================');

  try {
    const token = await getApiToken();
    console.log('✓ Successfully obtained API token');

    const callId = '201192';
    console.log(`\nTesting call ${callId} with multiple API calls...`);

    // Make first API call
    console.log('\n1. First API call:');
    const firstCall = await getCallExtraData(callId);
    if (!firstCall) {
      console.log('❌ Failed to fetch call data');
      return;
    }

    const firstStableHash = createStableHash(firstCall);
    const firstUnstableHash = createUnstableHash(firstCall);
    
    console.log(`   Stable hash length: ${firstStableHash.length}`);
    console.log(`   Unstable hash length: ${firstUnstableHash.length}`);
    console.log(`   Volatile fields in first call:`);
    console.log(`     Timestamp: ${firstCall.Timestamp}`);
    console.log(`     RequestId: ${firstCall.RequestId}`);
    console.log(`     Version: ${firstCall.Version}`);

    // Wait a moment and make second API call
    console.log('\n2. Waiting 2 seconds for metadata to change...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n3. Second API call:');
    const secondCall = await getCallExtraData(callId);
    if (!secondCall) {
      console.log('❌ Failed to fetch call data on second attempt');
      return;
    }

    const secondStableHash = createStableHash(secondCall);
    const secondUnstableHash = createUnstableHash(secondCall);
    
    console.log(`   Stable hash length: ${secondStableHash.length}`);
    console.log(`   Unstable hash length: ${secondUnstableHash.length}`);
    console.log(`   Volatile fields in second call:`);
    console.log(`     Timestamp: ${secondCall.Timestamp}`);
    console.log(`     RequestId: ${secondCall.RequestId}`);
    console.log(`     Version: ${secondCall.Version}`);

    // Compare hashes
    console.log('\n4. Hash Comparison Results:');
    
    const stableHashMatch = firstStableHash === secondStableHash;
    const unstableHashMatch = firstUnstableHash === secondUnstableHash;
    
    console.log(`   Stable hashes match: ${stableHashMatch ? '✓ YES' : '❌ NO'}`);
    console.log(`   Unstable hashes match: ${unstableHashMatch ? '✓ YES' : '❌ NO'}`);
    
    if (stableHashMatch && !unstableHashMatch) {
      console.log('\n🎉 SUCCESS: Fix is working correctly!');
      console.log('   - Stable hash excludes volatile metadata and remains consistent');
      console.log('   - Unstable hash changes due to volatile metadata');
      console.log('   - This will prevent duplicate uploads for unchanged calls');
    } else if (stableHashMatch && unstableHashMatch) {
      console.log('\n⚠️  WARNING: Both hashes match (unusual but possible)');
      console.log('   - This could happen if API calls are very close together');
      console.log('   - The fix should still work for normal polling intervals');
    } else if (!stableHashMatch) {
      console.log('\n❌ PROBLEM: Stable hashes don\'t match');
      console.log('   - Call data may have actually changed between requests');
      console.log('   - Or there may be additional volatile fields to exclude');
    }

    // Analyze what changed in volatile fields
    console.log('\n5. Volatile Field Analysis:');
    const volatileFields = ['Timestamp', 'RequestId', 'Version', 'Node', 'Environment'];
    
    for (const field of volatileFields) {
      const firstValue = firstCall[field];
      const secondValue = secondCall[field];
      const changed = firstValue !== secondValue;
      
      console.log(`   ${field}: ${changed ? 'CHANGED' : 'SAME'}`);
      if (changed) {
        console.log(`     First:  ${firstValue}`);
        console.log(`     Second: ${secondValue}`);
      }
    }

    console.log('\n6. Summary:');
    console.log(`   The duplicate upload fix ${stableHashMatch ? 'SUCCESSFULLY' : 'FAILED TO'} exclude volatile metadata`);
    console.log(`   Future polling cycles should ${stableHashMatch ? 'show "No changes detected"' : 'continue to show false changes'}`);

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

async function main() {
  try {
    await verifyDuplicateUploadFix();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyDuplicateUploadFix, createStableHash };