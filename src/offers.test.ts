import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateOffers, normalizeHotelName } from './offers';

const supplierA = [
  { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
  { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 }
];
const supplierB = [
  { hotelId: 'b1', name: ' Holtin ', price: 5340, city: 'delhi', commissionPct: 20 },
  { hotelId: 'b2', name: 'Taj Avenue', price: 4600, city: 'delhi', commissionPct: 11 }
];

test('deduplicates overlapping names and keeps the cheaper offer', () => {
  const offers = deduplicateOffers('delhi', supplierA, supplierB);
  assert.equal(offers.find((offer) => offer.name === 'Holtin')?.supplier, 'Supplier B');
  assert.equal(offers.find((offer) => offer.name === 'Holtin')?.price, 5340);
});

test('keeps hotels found in only one supplier', () => {
  const offers = deduplicateOffers('delhi', supplierA, supplierB);
  assert.ok(offers.some((offer) => offer.name === 'Radison'));
  assert.ok(offers.some((offer) => offer.name === 'Taj Avenue'));
});

test('normalizes names for matching', () => {
  assert.equal(normalizeHotelName('  Grand   Hotel '), 'grand hotel');
});

test('returns no offers for an unknown city', () => {
  assert.deepEqual(deduplicateOffers('chennai', supplierA, supplierB), []);
});
