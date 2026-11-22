import { HotelOffer, SupplierHotel } from './types';

export function normalizeHotelName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function deduplicateOffers(
  city: string,
  supplierA: SupplierHotel[],
  supplierB: SupplierHotel[]
): HotelOffer[] {
  const bestByName = new Map<string, HotelOffer>();

  const add = (hotel: SupplierHotel, supplier: 'Supplier A' | 'Supplier B') => {
    const normalizedName = normalizeHotelName(hotel.name);
    if (!normalizedName || hotel.city.trim().toLowerCase() !== city.trim().toLowerCase()) return;

    const offer: HotelOffer = {
      name: hotel.name.trim().replace(/\s+/g, ' '),
      price: hotel.price,
      supplier,
      commissionPct: hotel.commissionPct
    };
    const existing = bestByName.get(normalizedName);

    if (!existing || offer.price < existing.price) {
      bestByName.set(normalizedName, offer);
    }
  };

  supplierA.forEach((hotel) => add(hotel, 'Supplier A'));
  supplierB.forEach((hotel) => add(hotel, 'Supplier B'));

  return [...bestByName.values()].sort((a, b) => a.price - b.price);
}
