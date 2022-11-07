import type { Job } from 'bull';
import Bull from 'bull';

import { AnalyticsTask } from './tasks/analytics.task';
import type { AnalyticsTaskItem } from './tasks/analytics.task';

type AnalyticsJobRemove = (job: Job<any>) => Promise<void>;
type AnalyticsJobAdd = (data: AnalyticsTaskItem) => Promise<void>;

const AnalyticsQueue = new Bull('analytics', {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number.parseInt(process.env.REDIS_PORT as string, 10) || 6379,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: '',
    tls: {
      host: process.env.REDIS_TLS_HOST,
    },
  },
});

const remove: AnalyticsJobRemove = async (job) => {
  await job.remove();
};

const add: AnalyticsJobAdd = async (data) => {
  await AnalyticsQueue.add(data, {
    attempts: 5,
    //delay: 500 // 0.5ms
  });
};

AnalyticsQueue.process((job, callback) => AnalyticsTask.process(job, callback));

AnalyticsQueue.on('completed', async (job, data) => {
  console.log(data);

  // Clear redis/data
  await remove(job);
});

AnalyticsQueue.on('error', console.log);
AnalyticsQueue.on('failed', console.log);
// AnalyticsQueue.on('active', console.log);

export { AnalyticsQueue, add };
