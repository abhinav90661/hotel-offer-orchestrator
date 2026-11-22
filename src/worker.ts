import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';

export async function runWorker(): Promise<void> {
  let connection: NativeConnection | undefined;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
      });
      break;
    } catch (error) {
      console.warn(`Temporal connection attempt ${attempt}/30 failed; retrying`, error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!connection) throw new Error('Unable to connect to Temporal');

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: 'hotel-offers',
    workflowsPath: require.resolve('./workflows'),
    activities
  });
  await worker.run();
}

if (require.main === module) {
  runWorker().catch((error) => {
    console.error('Temporal worker failed', error);
    process.exit(1);
  });
}
