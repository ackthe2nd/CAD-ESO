/**
 * Test Pacific Time Conversion
 */
const { convertToPacificTime } = require('./src/xml-generator-pacific-time');

console.log('Testing Pacific Time Conversion:');

// Test with current UTC time
const utcTime = '2025-06-07T22:06:49.12';
const pacificTime = convertToPacificTime(utcTime);

console.log(`UTC Time: ${utcTime}`);
console.log(`Pacific Time: ${pacificTime}`);

// Test with LoggedOnUtc format
const utcTime2 = '2025-06-07T22:01:05.833';
const pacificTime2 = convertToPacificTime(utcTime2);

console.log(`UTC Time 2: ${utcTime2}`);
console.log(`Pacific Time 2: ${pacificTime2}`);

// Test current time conversion
const now = new Date().toISOString();
const nowPacific = convertToPacificTime(now);

console.log(`Current UTC: ${now}`);
console.log(`Current Pacific: ${nowPacific}`);