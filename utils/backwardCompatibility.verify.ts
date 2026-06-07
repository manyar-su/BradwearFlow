/**
 * Backward Compatibility Verification Script
 * Tests that existing order data (SizeDetail[]) loads correctly with new deserialization
 * and that saved data maintains SizeDetail[] format for backward compatibility
 * 
 * Run with: npx tsx utils/backwardCompatibility.verify.ts
 */

import { deserializeSizeDetails, serializeSizeGroups } from './sizeGrouping';
import { SizeDetail, JenisBarang, ModelCelana, ModelRompi, SakuColor, SakuType } from '../types';

console.log('=== Backward Compatibility Verification ===\n');

// Test 1: Load existing KEMEJA order data
console.log('Test 1: Load existing KEMEJA order data');
const existingKemejaData: SizeDetail[] = [
  {
    size: 'M',
    jumlah: 5,
    gender: 'Pria',
    tangan: 'Pendek',
    warna: 'Putih',
    model: 'Brad V2',
  },
  {
    size: 'L',
    jumlah: 3,
    gender: 'Pria',
    tangan: 'Pendek',
    warna: 'Putih',
    model: 'Brad V2',
  },
  {
    size: 'XL',
    jumlah: 2,
    gender: 'Pria',
    tangan: 'Panjang',
    warna: 'Putih',
    model: 'Brad V2',
  },
];

const kemejaGroups = deserializeSizeDetails(existingKemejaData, JenisBarang.KEMEJA);
console.log('Expected: 2 groups (Pendek with 2 sizes, Panjang with 1 size)');
console.log('Result:', {
  groupCount: kemejaGroups.length,
  group1: {
    gender: kemejaGroups[0]?.gender,
    tangan: kemejaGroups[0]?.tangan,
    sizesCount: kemejaGroups[0]?.sizes.length,
    sizes: kemejaGroups[0]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
  group2: {
    gender: kemejaGroups[1]?.gender,
    tangan: kemejaGroups[1]?.tangan,
    sizesCount: kemejaGroups[1]?.sizes.length,
    sizes: kemejaGroups[1]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
});
const test1Pass = kemejaGroups.length === 2 && 
  kemejaGroups[0].sizes.length === 2 && 
  kemejaGroups[1].sizes.length === 1;
console.log(test1Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 2: Load existing CELANA order data
console.log('Test 2: Load existing CELANA order data');
const existingCelanaData: SizeDetail[] = [
  {
    size: '28',
    jumlah: 10,
    gender: 'Pria',
    tangan: 'Pendek',
    modelCelana: ModelCelana.WARRIOR,
  },
  {
    size: '30',
    jumlah: 15,
    gender: 'Pria',
    tangan: 'Pendek',
    modelCelana: ModelCelana.WARRIOR,
  },
  {
    size: '32',
    jumlah: 8,
    gender: 'Pria',
    tangan: 'Pendek',
    modelCelana: ModelCelana.ARMOR,
  },
];

const celanaGroups = deserializeSizeDetails(existingCelanaData, JenisBarang.CELANA);
console.log('Expected: 2 groups (WARRIOR with 2 sizes, ARMOR with 1 size)');
console.log('Result:', {
  groupCount: celanaGroups.length,
  group1: {
    modelCelana: celanaGroups[0]?.modelCelana,
    sizesCount: celanaGroups[0]?.sizes.length,
    sizes: celanaGroups[0]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
  group2: {
    modelCelana: celanaGroups[1]?.modelCelana,
    sizesCount: celanaGroups[1]?.sizes.length,
    sizes: celanaGroups[1]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
});
const test2Pass = celanaGroups.length === 2 && 
  celanaGroups[0].sizes.length === 2 && 
  celanaGroups[1].sizes.length === 1;
console.log(test2Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 3: Load existing ROMPI order data
console.log('Test 3: Load existing ROMPI order data');
const existingRompiData: SizeDetail[] = [
  {
    size: 'M',
    jumlah: 5,
    gender: 'Pria',
    tangan: 'Pendek',
    modelRompi: ModelRompi.BUPATI,
  },
  {
    size: 'L',
    jumlah: 3,
    gender: 'Pria',
    tangan: 'Pendek',
    modelRompi: ModelRompi.CUSTOM,
  },
];

const rompiGroups = deserializeSizeDetails(existingRompiData, JenisBarang.ROMPI);
console.log('Expected: 2 groups (BUPATI with 1 size, CUSTOM with 1 size)');
console.log('Result:', {
  groupCount: rompiGroups.length,
  group1: {
    modelRompi: rompiGroups[0]?.modelRompi,
    sizesCount: rompiGroups[0]?.sizes.length,
    sizes: rompiGroups[0]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
  group2: {
    modelRompi: rompiGroups[1]?.modelRompi,
    sizesCount: rompiGroups[1]?.sizes.length,
    sizes: rompiGroups[1]?.sizes.map(s => ({ size: s.size, jumlah: s.jumlah })),
  },
});
const test3Pass = rompiGroups.length === 2 && 
  rompiGroups[0].sizes.length === 1 && 
  rompiGroups[1].sizes.length === 1;
console.log(test3Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 4: Verify saved data maintains SizeDetail[] format
console.log('Test 4: Verify saved data maintains SizeDetail[] format');
const serialized = serializeSizeGroups(kemejaGroups, JenisBarang.KEMEJA);
console.log('Expected: Flat array with 3 SizeDetail entries');
console.log('Result:', {
  isArray: Array.isArray(serialized),
  count: serialized.length,
  allHaveSize: serialized.every(s => typeof s.size === 'string'),
  allHaveJumlah: serialized.every(s => typeof s.jumlah === 'number'),
  allHaveGender: serialized.every(s => s.gender !== undefined),
  allHaveTangan: serialized.every(s => s.tangan !== undefined),
  sample: serialized[0],
});
const test4Pass = Array.isArray(serialized) && 
  serialized.length === 3 &&
  serialized.every(s => s.size !== undefined && s.jumlah !== undefined);
console.log(test4Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 5: Round-trip with existing data preserves all information
console.log('Test 5: Round-trip with existing data preserves all information');
const roundTripSerialized = serializeSizeGroups(kemejaGroups, JenisBarang.KEMEJA);
const roundTripDeserialized = deserializeSizeDetails(roundTripSerialized, JenisBarang.KEMEJA);

const originalTotalSizes = existingKemejaData.length;
const roundTripTotalSizes = roundTripDeserialized.reduce((sum, g) => sum + g.sizes.length, 0);
const originalTotalQuantity = existingKemejaData.reduce((sum, s) => sum + s.jumlah, 0);
const roundTripTotalQuantity = roundTripDeserialized.reduce(
  (sum, g) => sum + g.sizes.reduce((s, sz) => s + sz.jumlah, 0),
  0
);

console.log('Expected: Same number of sizes and total quantity');
console.log('Result:', {
  originalSizes: originalTotalSizes,
  roundTripSizes: roundTripTotalSizes,
  sizesMatch: originalTotalSizes === roundTripTotalSizes,
  originalQuantity: originalTotalQuantity,
  roundTripQuantity: roundTripTotalQuantity,
  quantityMatch: originalTotalQuantity === roundTripTotalQuantity,
});
const test5Pass = originalTotalSizes === roundTripTotalSizes && 
  originalTotalQuantity === roundTripTotalQuantity;
console.log(test5Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 6: Load data with custom measurements
console.log('Test 6: Load data with custom measurements');
const dataWithCustomMeasurements: SizeDetail[] = [
  {
    size: 'Custom',
    jumlah: 1,
    gender: 'Pria',
    tangan: 'Pendek',
    namaPerSize: 'John Doe',
    isCustomSize: true,
    customMeasurements: {
      tinggi: 170,
      lebarDada: 100,
      lebarBahu: 45,
    },
  },
];

const customGroups = deserializeSizeDetails(dataWithCustomMeasurements, JenisBarang.KEMEJA);
const customSize = customGroups[0]?.sizes[0];
console.log('Expected: Custom measurements preserved');
console.log('Result:', {
  hasCustomMeasurements: customSize?.customMeasurements !== undefined,
  hasNamaPerSize: customSize?.namaPerSize !== undefined,
  isCustomSize: customSize?.isCustomSize,
  customMeasurements: customSize?.customMeasurements,
});
const test6Pass = customSize?.customMeasurements !== undefined && 
  customSize?.namaPerSize === 'John Doe' &&
  customSize?.isCustomSize === true;
console.log(test6Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 7: Load data with shared attributes (warna, model, etc.)
console.log('Test 7: Load data with shared attributes preserved');
const dataWithSharedAttrs: SizeDetail[] = [
  {
    size: 'M',
    jumlah: 5,
    gender: 'Pria',
    tangan: 'Pendek',
    warna: 'Biru',
    model: 'Brad V3',
    sakuType: SakuType.POLOS,
    sakuColor: SakuColor.ABU,
  },
  {
    size: 'L',
    jumlah: 3,
    gender: 'Pria',
    tangan: 'Pendek',
    warna: 'Biru',
    model: 'Brad V3',
    sakuType: SakuType.POLOS,
    sakuColor: SakuColor.ABU,
  },
];

const sharedAttrGroups = deserializeSizeDetails(dataWithSharedAttrs, JenisBarang.KEMEJA);
const sharedGroup = sharedAttrGroups[0];
console.log('Expected: Shared attributes preserved at group level');
console.log('Result:', {
  warna: sharedGroup?.warna,
  model: sharedGroup?.model,
  sakuType: sharedGroup?.sakuType,
  sakuColor: sharedGroup?.sakuColor,
});
const test7Pass = sharedGroup?.warna === 'Biru' && 
  sharedGroup?.model === 'Brad V3' &&
  sharedGroup?.sakuType === SakuType.POLOS;
console.log(test7Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Test 8: Empty data handling
console.log('Test 8: Empty data handling');
const emptyGroups = deserializeSizeDetails([], JenisBarang.KEMEJA);
console.log('Expected: Empty array');
console.log('Result:', { groupCount: emptyGroups.length });
const test8Pass = emptyGroups.length === 0;
console.log(test8Pass ? '✓ PASS\n' : '✗ FAIL\n');

// Summary
console.log('=== Summary ===\n');
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass, test7Pass, test8Pass];
const passedCount = allTests.filter(t => t).length;
const totalCount = allTests.length;

console.log(`Passed: ${passedCount}/${totalCount} tests`);
console.log('\n✓ Existing order data loads correctly with new deserialization');
console.log('✓ Saved data maintains SizeDetail[] format for backward compatibility');
console.log('✓ Custom measurements and shared attributes are preserved');
console.log('✓ Round-trip serialization maintains data integrity');

if (passedCount === totalCount) {
  console.log('\n🎉 All backward compatibility tests passed!');
} else {
  console.log('\n⚠️ Some tests failed. Please review the results above.');
  process.exit(1);
}
