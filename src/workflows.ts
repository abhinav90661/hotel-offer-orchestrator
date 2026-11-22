import { log, proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import { HotelOffer } from './types';

const { fetchSupplierA, fetchSupplierB, compareAndCacheOffers, filterOffers } = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export interface HotelSearchInput {
  city: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function hotelOfferWorkflow(input: HotelSearchInput): Promise<HotelOffer[]> {
  log.info('Hotel offer workflow started', { city: input.city, minPrice: input.minPrice, maxPrice: input.maxPrice });
  const [aResult, bResult] = await Promise.allSettled([
    fetchSupplierA(input.city),
    fetchSupplierB(input.city)
  ]);
  const supplierA = aResult.status === 'fulfilled' ? aResult.value : [];
  const supplierB = bResult.status === 'fulfilled' ? bResult.value : [];
  await compareAndCacheOffers(input.city, supplierA, supplierB);
  const result = await filterOffers(input.city, input.minPrice, input.maxPrice);
  log.info('Hotel offer workflow completed', { city: input.city, offerCount: result.length });
  return result;
}
