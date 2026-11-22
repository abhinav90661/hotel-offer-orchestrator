import express, { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { Connection, Client } from '@temporalio/client';
import { supplierAHotels, supplierBHotels } from './hotelData';
import { redis } from './redis';

const app = express();
app.use(express.json());

app.get('/supplierA/hotels', (req: Request, res: Response) => {
  if (process.env.SUPPLIER_A_DOWN === 'true' || req.query.down === 'true') {
    res.status(503).json({ error: 'Supplier A unavailable' });
    return;
  }
  const city = typeof req.query.city === 'string' ? req.query.city.toLowerCase() : undefined;
  res.json(city ? supplierAHotels.filter((hotel) => hotel.city === city) : supplierAHotels);
});

app.get('/supplierB/hotels', (req: Request, res: Response) => {
  if (process.env.SUPPLIER_B_DOWN === 'true' || req.query.down === 'true') {
    res.status(503).json({ error: 'Supplier B unavailable' });
    return;
  }
  const city = typeof req.query.city === 'string' ? req.query.city.toLowerCase() : undefined;
  res.json(city ? supplierBHotels.filter((hotel) => hotel.city === city) : supplierBHotels);
});

app.post('/api/test/supplier/:supplier/down', (req: Request, res: Response) => {
  const supplier = req.params.supplier.toLowerCase();
  if (supplier !== 'a' && supplier !== 'b') {
    res.status(400).json({ error: 'supplier must be a or b' });
    return;
  }
  const down = req.body?.down === true;
  process.env[supplier === 'a' ? 'SUPPLIER_A_DOWN' : 'SUPPLIER_B_DOWN'] = String(down);
  res.json({ supplier: supplier.toUpperCase(), down });
});

app.get('/api/hotels', async (req: Request, res: Response, next: NextFunction) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) {
    res.status(400).json({ error: 'city query parameter is required' });
    return;
  }

  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (req.query.minPrice !== undefined) {
    minPrice = Number(req.query.minPrice);
    if (!Number.isFinite(minPrice) || minPrice < 0) {
      res.status(400).json({ error: 'minPrice must be a non-negative number' });
      return;
    }
  }
  if (req.query.maxPrice !== undefined) {
    maxPrice = Number(req.query.maxPrice);
    if (!Number.isFinite(maxPrice) || maxPrice < 0) {
      res.status(400).json({ error: 'maxPrice must be a non-negative number' });
      return;
    }
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    res.status(400).json({ error: 'minPrice cannot be greater than maxPrice' });
    return;
  }

  try {
    const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
    const client = new Client({ connection, namespace: process.env.TEMPORAL_NAMESPACE || 'default' });
    const workflowId = `hotel-offers-${city.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await client.workflow.execute('hotelOfferWorkflow', {
      taskQueue: 'hotel-offers',
      workflowId,
      args: [{ city, minPrice, maxPrice }]
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/health', async (_req: Request, res: Response) => {
  const base = process.env.SUPPLIER_BASE_URL || 'http://localhost:3000';
  const checkSupplier = async (path: string) => {
    try {
      await axios.get(`${base}${path}`, { timeout: 2500 });
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  };
  const [supplierA, supplierB] = await Promise.all([
    checkSupplier('/supplierA/hotels'),
    checkSupplier('/supplierB/hotels')
  ]);
  let redisStatus = 'healthy';
  try { await redis.ping(); } catch { redisStatus = 'unhealthy'; }
  const statuses = [supplierA, supplierB, redisStatus];
  res.status(statuses.includes('unhealthy') ? 503 : 200).json({ status: statuses.includes('unhealthy') ? 'degraded' : 'healthy', supplierA, supplierB, redis: redisStatus });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Request failed', error);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'api_started', port }));
});
