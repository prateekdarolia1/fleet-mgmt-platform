// Quick validation test to show warning sources
const fs = require('fs');
const Papa = require('papaparse');

// Read CSV
const csvData = fs.readFileSync('./import_data/Bulk_Vehicle.csv', 'utf8');

// Parse CSV
const parsed = Papa.parse(csvData, { header: true });
const rows = parsed.data;

console.log('Total rows:', rows.length);
console.log('\nFirst 3 rows with chassis lengths:');
rows.slice(0, 3).forEach((row, i) => {
  const chassisNumber = row['Chassis Number'];
  const deliveryDate = row['Delivery Date'];
  console.log(`Row ${i + 1}:`);
  console.log(`  Chassis: "${chassisNumber}" (length: ${chassisNumber.length})`);
  console.log(`  Delivery Date: "${deliveryDate}"`);
  console.log(`  Will warn? ${chassisNumber.length !== 17 ? 'YES - Non-standard VIN length' : 'NO - Standard VIN'}`);
  console.log('');
});

// Count by chassis length
const lengthCounts = {};
rows.forEach(row => {
  const len = row['Chassis Number'].length;
  lengthCounts[len] = (lengthCounts[len] || 0) + 1;
});

console.log('Chassis number lengths:');
Object.entries(lengthCounts)
  .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
  .forEach(([len, count]) => {
    const status = len === '17' ? '✓ VALID' : '⚠ WARNING';
    console.log(`  ${len} characters: ${count} rows ${status}`);
  });

// Calculate warnings
const validRows = lengthCounts['17'] || 0;
const warningRows = rows.length - validRows;
console.log(`\nSummary:`);
console.log(`  Valid (17-char VINs): ${validRows}`);
console.log(`  Warnings (non-17-char): ${warningRows}`);
