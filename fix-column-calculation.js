/**
 * Fix Column Calculation for Google Sheets
 * Properly convert column indices to Excel-style column letters (A, B, ..., Z, AA, AB, etc.)
 */

/**
 * Convert column index to Excel-style column letter
 * @param {number} index - 0-based column index
 * @returns {string} - Excel column letter (A, B, ..., Z, AA, AB, etc.)
 */
function indexToColumnLetter(index) {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

/**
 * Test the column calculation
 */
function testColumnCalculation() {
  console.log('Testing Column Index to Letter Conversion:');
  console.log('Index | Expected | Calculated | Match');
  console.log('------|----------|------------|------');
  
  const testCases = [
    { index: 0, expected: 'A' },
    { index: 1, expected: 'B' },
    { index: 5, expected: 'F' },
    { index: 25, expected: 'Z' },
    { index: 26, expected: 'AA' },
    { index: 27, expected: 'AB' },
    { index: 35, expected: 'AJ' },
    { index: 36, expected: 'AK' },
    { index: 37, expected: 'AL' },
    { index: 51, expected: 'AZ' },
    { index: 52, expected: 'BA' }
  ];
  
  for (const test of testCases) {
    const calculated = indexToColumnLetter(test.index);
    const match = calculated === test.expected ? '✅' : '❌';
    console.log(`${test.index.toString().padStart(5)} | ${test.expected.padStart(8)} | ${calculated.padStart(10)} | ${match}`);
  }
}

testColumnCalculation();

console.log('\nFrom the debug output:');
console.log('Test Result is at index 37, which should be column AL');
console.log('Test Call is at index 36, which should be column AK');
console.log('Incident Type is at index 5, which should be column F');

console.log('\nThe issue: Test Result updates are going to Incident Type column instead of Test Result column');
console.log('Solution: Fix the column calculation in updateTestResult function');

module.exports = { indexToColumnLetter };