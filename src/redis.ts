import Redis from 'ioredis';
import { HotelOffer } from './types';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3
});

const offersKey = (city: string) => `hotel-offers:${city.toLowerCase()}`;
const namesKey = (city: string) => `hotel-names:${city.toLowerCase()}`;

export async function cacheOffers(city: string, offers: HotelOffer[]): Promise<void> {
  const offerKey = offersKey(city);
  const nameKey = namesKey(city);
  await redis.del(offerKey, nameKey);
  if (!offers.length) return;
  const pipeline = redis.pipeline();
  pipeline.zadd(offerKey, ...offers.flatMap((offer) => [offer.price, offer.name.toLowerCase()]));
  pipeline.hset(nameKey, Object.fromEntries(offers.map((offer) => [offer.name.toLowerCase(), JSON.stringify(offer)])));
  await pipeline.exec();
}

export async function filterCachedOffers(city: string, minPrice?: number, maxPrice?: number): Promise<HotelOffer[]> {
  const offerKey = offersKey(city);
  const nameKey = namesKey(city);
  const min = minPrice ?? '-inf';
  const max = maxPrice ?? '+inf';
  const names = await redis.zrangebyscore(offerKey, min, max);
  if (!names.length) return [];
  const values = await redis.hmget(nameKey, ...names);
  return values.filter((value): value is string => value !== null).map((value) => JSON.parse(value));
}
