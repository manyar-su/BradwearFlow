/**
 * Verification script for Kode Barang and Kode Warna utilities
 * Run with: npx tsx utils/kodeBarangWarna.verify.ts
 */

import {
  isValidKodeBarang,
  isKodeWarna,
  parseWarnaWithCode,
  extractKodeWarna,
  extractNamaWarna,
  validateAndFormatKodeBarang,
  generateItemDescription,
} from './kodeBarangWarna';

console.log('=== Kode Barang and Kode Warna Verification ===\n');

// Test 1: isValidKodeBarang
console.log('Test 1: isValidKodeBarang');
const kodeBarangTests = [
  { input: '1234', expected: true, desc: '4 digits' },
  { input: '5678', expected: true, desc: '4 digits' },
  { input: 'TDP', expected: true, desc: 'TDP special case' },
  { input: 'TDP4567', expected: true, desc: 'TDP prefixed code' },
  { input: 'tdp', expected: true, desc: 'TDP lowercase' },
  { input: 'tdp890', expected: true, desc: 'TDP lowercase prefixed code' },
  { input: 'B011', expected: false, desc: 'has letter' },
  { input: 'B0299', expected: false, desc: 'has letter' },
  { input: '12345', expected: false, desc: '5 digits' },
  { input: '123', expected: false, desc: '3 digits' },
  { input: '', expected: false, desc: 'empty' },
];

let test1Pass = true;
kodeBarangTests.forEach(test => {
  const result = isValidKodeBarang(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" (${test.desc}): ${result} (expected: ${test.expected})`);
  if (!pass) test1Pass = false;
});
console.log(test1Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 2: isKodeWarna
console.log('Test 2: isKodeWarna');
const kodeWarnaTests = [
  { input: 'B011', expected: true, desc: 'letter + digits' },
  { input: 'B0299', expected: true, desc: 'letter + digits' },
  { input: 'V123', expected: true, desc: 'letter + digits' },
  { input: 'ABC123', expected: true, desc: 'multiple letters + digits' },
  { input: '1234', expected: false, desc: 'only digits' },
  { input: 'TDP', expected: false, desc: 'only letters' },
  { input: '', expected: false, desc: 'empty' },
];

let test2Pass = true;
kodeWarnaTests.forEach(test => {
  const result = isKodeWarna(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" (${test.desc}): ${result} (expected: ${test.expected})`);
  if (!pass) test2Pass = false;
});
console.log(test2Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 3: parseWarnaWithCode
console.log('Test 3: parseWarnaWithCode');
const parseWarnaTests = [
  { input: 'TROPICAL NAVY Kode B011', expected: 'TROPICAL NAVY B011', desc: 'with "Kode" keyword' },
  { input: 'TROPICAL NAVY kode B011', expected: 'TROPICAL NAVY B011', desc: 'with "kode" lowercase' },
  { input: 'HITAM B0299', expected: 'HITAM B0299', desc: 'without keyword' },
  { input: 'VENTURA V123', expected: 'VENTURA V123', desc: 'without keyword' },
  { input: 'PUTIH', expected: 'PUTIH', desc: 'no kode' },
  { input: 'TROPICAL HITAM', expected: 'TROPICAL HITAM', desc: 'no kode, multiple words' },
];

let test3Pass = true;
parseWarnaTests.forEach(test => {
  const result = parseWarnaWithCode(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" → "${result}" (expected: "${test.expected}")`);
  if (!pass) test3Pass = false;
});
console.log(test3Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 4: extractKodeWarna
console.log('Test 4: extractKodeWarna');
const extractKodeTests = [
  { input: 'TROPICAL NAVY B011', expected: 'B011', desc: 'kode at end' },
  { input: 'HITAM B0299', expected: 'B0299', desc: 'kode at end' },
  { input: 'PUTIH', expected: null, desc: 'no kode' },
  { input: 'TROPICAL HITAM', expected: null, desc: 'no kode' },
];

let test4Pass = true;
extractKodeTests.forEach(test => {
  const result = extractKodeWarna(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" → ${result} (expected: ${test.expected})`);
  if (!pass) test4Pass = false;
});
console.log(test4Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 5: extractNamaWarna
console.log('Test 5: extractNamaWarna');
const extractNamaTests = [
  { input: 'TROPICAL NAVY B011', expected: 'TROPICAL NAVY', desc: 'remove kode' },
  { input: 'HITAM B0299', expected: 'HITAM', desc: 'remove kode' },
  { input: 'PUTIH', expected: 'PUTIH', desc: 'no kode to remove' },
];

let test5Pass = true;
extractNamaTests.forEach(test => {
  const result = extractNamaWarna(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" → "${result}" (expected: "${test.expected}")`);
  if (!pass) test5Pass = false;
});
console.log(test5Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 6: validateAndFormatKodeBarang
console.log('Test 6: validateAndFormatKodeBarang');
const validateKodeTests = [
  { input: '1234', expected: '1234', desc: 'valid 4 digits' },
  { input: 'tdp', expected: 'TDP', desc: 'TDP uppercase conversion' },
  { input: 'TDP', expected: 'TDP', desc: 'TDP already uppercase' },
  { input: 'tdp4567', expected: 'TDP4567', desc: 'TDP prefixed code uppercase conversion' },
  { input: 'B011', expected: null, desc: 'invalid - has letter' },
  { input: '12345', expected: null, desc: 'invalid - 5 digits' },
];

let test6Pass = true;
validateKodeTests.forEach(test => {
  const result = validateAndFormatKodeBarang(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} "${test.input}" → ${result} (expected: ${test.expected})`);
  if (!pass) test6Pass = false;
});
console.log(test6Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 7: generateItemDescription
console.log('Test 7: generateItemDescription');
const descTests = [
  {
    input: {
      jenisBarang: 'KEMEJA',
      warna: 'TROPICAL NAVY B011',
      tangan: 'PANJANG',
      gender: 'Pria',
    },
    expected: 'KEMEJA TROPICAL NAVY B011 PANJANG LAKI-LAKI',
    desc: 'KEMEJA with warna kode',
  },
  {
    input: {
      jenisBarang: 'KEMEJA',
      warna: 'HITAM B0299',
      tangan: 'PENDEK',
      gender: 'Wanita',
    },
    expected: 'KEMEJA HITAM B0299 PENDEK PEREMPUAN',
    desc: 'KEMEJA female',
  },
  {
    input: {
      jenisBarang: 'CELANA',
      modelCelana: 'WARRIOR',
    },
    expected: 'CELANA WARRIOR',
    desc: 'CELANA with model',
  },
  {
    input: {
      jenisBarang: 'ROMPI',
      warna: 'HITAM',
      modelRompi: 'BUPATI',
    },
    expected: 'ROMPI HITAM BUPATI',
    desc: 'ROMPI with warna and model',
  },
];

let test7Pass = true;
descTests.forEach(test => {
  const result = generateItemDescription(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✓' : '✗'} ${test.desc}`);
  console.log(`    Result: "${result}"`);
  console.log(`    Expected: "${test.expected}"`);
  if (!pass) test7Pass = false;
});
console.log(test7Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Summary
console.log('=== Summary ===\n');
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass, test7Pass];
const passedCount = allTests.filter(t => t).length;
const totalCount = allTests.length;

console.log(`Passed: ${passedCount}/${totalCount} tests`);

if (passedCount === totalCount) {
  console.log('\n✓ Kode Barang validation works correctly');
  console.log('✓ Kode Warna identification works correctly');
  console.log('✓ Warna parsing and combination works correctly');
  console.log('✓ Item description generation works correctly');
  console.log('\n🎉 All Kode Barang and Kode Warna tests passed!');
} else {
  console.log('\n⚠️ Some tests failed. Please review the results above.');
  process.exit(1);
}
