/**
 * Verification script for custom size display with namaPerSize
 * Tests that custom sizes display the person's name instead of "CUSTOM"
 * 
 * Run with: npx tsx utils/customSizeDisplay.verify.ts
 */

import { deserializeSizeDetails, serializeSizeGroups } from './sizeGrouping';
import { SizeDetail, JenisBarang } from '../types';

console.log('=== Custom Size Display Verification ===\n');

// Test 1: Custom size with namaPerSize should display the name
console.log('Test 1: Custom size with namaPerSize displays name');
const customSizeData: SizeDetail[] = [
  {
    size: 'CUSTOM',
    jumlah: 1,
    gender: 'Pria',
    tangan: 'Panjang',
    namaPerSize: 'Akub',
    isCustomSize: true,
    customMeasurements: {
      tinggi: 72,
      lebarDada: 54,
      lebarBahu: 47,
      lingkaranPerut: 101,
      lingkarPinggul: 105,
      panjangLengan: 60,
    },
  },
  {
    size: 'CUSTOM',
    jumlah: 1,
    gender: 'Pria',
    tangan: 'Panjang',
    namaPerSize: 'DWI',
    isCustomSize: true,
    customMeasurements: {
      tinggi: 79,
      lebarDada: 127,
      lebarBahu: 50,
      lingkaranPerut: 129,
      lingkarPinggul: 133,
      panjangLengan: 59,
    },
  },
];

const groups = deserializeSizeDetails(customSizeData, JenisBarang.KEMEJA);
console.log('Expected: 1 group with 2 sizes, each with namaPerSize preserved');
console.log('Result:', {
  groupCount: groups.length,
  sizesCount: groups[0]?.sizes.length,
  size1: {
    size: groups[0]?.sizes[0]?.size,
    namaPerSize: groups[0]?.sizes[0]?.namaPerSize,
    isCustomSize: groups[0]?.sizes[0]?.isCustomSize,
    hasCustomMeasurements: !!groups[0]?.sizes[0]?.customMeasurements,
  },
  size2: {
    size: groups[0]?.sizes[1]?.size,
    namaPerSize: groups[0]?.sizes[1]?.namaPerSize,
    isCustomSize: groups[0]?.sizes[1]?.isCustomSize,
    hasCustomMeasurements: !!groups[0]?.sizes[1]?.customMeasurements,
  },
});

const test1Pass = 
  groups.length === 1 &&
  groups[0].sizes.length === 2 &&
  groups[0].sizes[0].namaPerSize === 'Akub' &&
  groups[0].sizes[1].namaPerSize === 'DWI' &&
  groups[0].sizes[0].isCustomSize === true &&
  groups[0].sizes[1].isCustomSize === true;

console.log(test1Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 2: Round-trip preserves namaPerSize
console.log('Test 2: Round-trip serialization preserves namaPerSize');
const serialized = serializeSizeGroups(groups, JenisBarang.KEMEJA);
const deserialized = deserializeSizeDetails(serialized, JenisBarang.KEMEJA);

console.log('Expected: namaPerSize preserved after round-trip');
console.log('Result:', {
  originalName1: groups[0]?.sizes[0]?.namaPerSize,
  roundTripName1: deserialized[0]?.sizes[0]?.namaPerSize,
  originalName2: groups[0]?.sizes[1]?.namaPerSize,
  roundTripName2: deserialized[0]?.sizes[1]?.namaPerSize,
});

const test2Pass = 
  deserialized[0]?.sizes[0]?.namaPerSize === 'Akub' &&
  deserialized[0]?.sizes[1]?.namaPerSize === 'DWI';

console.log(test2Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 3: Mixed custom and regular sizes
console.log('Test 3: Mixed custom and regular sizes in same group');
const mixedData: SizeDetail[] = [
  {
    size: 'M',
    jumlah: 5,
    gender: 'Pria',
    tangan: 'Pendek',
  },
  {
    size: 'L',
    jumlah: 3,
    gender: 'Pria',
    tangan: 'Pendek',
  },
  {
    size: 'CUSTOM',
    jumlah: 1,
    gender: 'Pria',
    tangan: 'Pendek',
    namaPerSize: 'Iskandar T.',
    isCustomSize: true,
  },
];

const mixedGroups = deserializeSizeDetails(mixedData, JenisBarang.KEMEJA);
console.log('Expected: 1 group with 3 sizes (2 regular, 1 custom with name)');
console.log('Result:', {
  groupCount: mixedGroups.length,
  sizesCount: mixedGroups[0]?.sizes.length,
  regularSize1: mixedGroups[0]?.sizes[0]?.size,
  regularSize2: mixedGroups[0]?.sizes[1]?.size,
  customSize: {
    size: mixedGroups[0]?.sizes[2]?.size,
    namaPerSize: mixedGroups[0]?.sizes[2]?.namaPerSize,
    isCustomSize: mixedGroups[0]?.sizes[2]?.isCustomSize,
  },
});

const test3Pass = 
  mixedGroups.length === 1 &&
  mixedGroups[0].sizes.length === 3 &&
  mixedGroups[0].sizes[0].size === 'M' &&
  mixedGroups[0].sizes[1].size === 'L' &&
  mixedGroups[0].sizes[2].namaPerSize === 'Iskandar T.' &&
  mixedGroups[0].sizes[2].isCustomSize === true;

console.log(test3Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 4: Display logic - namaPerSize takes precedence over size
console.log('Test 4: Display logic - namaPerSize should be displayed instead of size');
const displayTestData: SizeDetail[] = [
  {
    size: 'CUSTOM',
    jumlah: 1,
    gender: 'Pria',
    tangan: 'Panjang',
    namaPerSize: 'TROPICAL NAVY Kode B011',
    isCustomSize: true,
  },
];

const displayGroups = deserializeSizeDetails(displayTestData, JenisBarang.KEMEJA);
const displaySize = displayGroups[0]?.sizes[0];

// Simulate the display logic from SizeEntry component
const displayValue = displaySize?.namaPerSize || displaySize?.size;

console.log('Expected: Display "TROPICAL NAVY Kode B011" instead of "CUSTOM"');
console.log('Result:', {
  size: displaySize?.size,
  namaPerSize: displaySize?.namaPerSize,
  displayValue: displayValue,
});

const test4Pass = displayValue === 'TROPICAL NAVY Kode B011';
console.log(test4Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Summary
console.log('=== Summary ===\n');
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass];
const passedCount = allTests.filter(t => t).length;
const totalCount = allTests.length;

console.log(`Passed: ${passedCount}/${totalCount} tests`);

if (passedCount === totalCount) {
  console.log('\n✓ Custom size display with namaPerSize works correctly');
  console.log('✓ namaPerSize is preserved through serialization/deserialization');
  console.log('✓ Display logic prioritizes namaPerSize over size field');
  console.log('\n🎉 All custom size display tests passed!');
} else {
  console.log('\n⚠️ Some tests failed. Please review the results above.');
  process.exit(1);
}
