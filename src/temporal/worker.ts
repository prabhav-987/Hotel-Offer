import { NativeConnection, Worker } from '@temporalio/worker';
import { config } from '../config';
import { logger } from '../logger';
import * as activities from './activities';

async function run() {
  const connection = await NativeConnection.connect({ address: config.temporalAddress });
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: config.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });
  logger.info('Temporal worker started', { taskQueue: config.taskQueue });
  await worker.run();
}

run().catch((err) => {
  logger.error('Worker crashed', { error: String(err) });
  process.exit(1);
});
