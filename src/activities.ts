import axios from 'axios';
import { cacheOffers, filterCachedOffers } from './redis';
import { HotelOffer, SupplierHotel } from './types';
import { deduplicateOffers } from './offers';

const supplierBaseUrl = () => process.env.SUPPLIER_BASE_URL || 'http://localhost:3000';

export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  try {
    const { data } = await axios.get<SupplierHotel[]>(`${supplierBaseUrl()}/supplierA/hotels`, {
      params: { city }, timeout: 5000
    });
    console.log(JSON.stringify({ event: 'supplier_fetch', supplier: 'A', city, count: data.length }));
    return data;
  } catch (error) {
    console.error(JSON.stringify({ event: 'supplier_fetch_failed', supplier: 'A', city, error: String(error) }));
    throw error;
  }
}

export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  try {
    const { data } = await axios.get<SupplierHotel[]>(`${supplierBaseUrl()}/supplierB/hotels`, {
      params: { city }, timeout: 5000
    });
    console.log(JSON.stringify({ event: 'supplier_fetch', supplier: 'B', city, count: data.length }));
    return data;
  } catch (error) {
    console.error(JSON.stringify({ event: 'supplier_fetch_failed', supplier: 'B', city, error: String(error) }));
    throw error;
  }
}

export async function compareAndCacheOffers(city: string, supplierA: SupplierHotel[], supplierB: SupplierHotel[]): Promise<HotelOffer[]> {
  const offers = deduplicateOffers(city, supplierA, supplierB);
  await cacheOffers(city, offers);
  console.log(JSON.stringify({ event: 'offers_compared', city, supplierACount: supplierA.length, supplierBCount: supplierB.length, offerCount: offers.length }));
  return offers;
}

export async function filterOffers(city: string, minPrice?: number, maxPrice?: number): Promise<HotelOffer[]> {
  return filterCachedOffers(city, minPrice, maxPrice);
}
