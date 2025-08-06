import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Connection configuration for Redis
const connection = {
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: 3,
};

// Create the automation queue for job processing
export const automationQueue = new Queue("automation", { 
  connection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,         // Start with 2 second delay
    },
  }
});

// Export the connection for use in workers
export const redisConnection = connection;

// Queue management functions
export async function addAutomationJob(jobData: {
  jobId: string;
  userId: string;
  runId: string;
}) {
  try {
    const job = await automationQueue.add('process-application', jobData, {
      jobId: jobData.runId, // Use runId as BullMQ job ID for easy tracking
    });
    
    console.log(`Queued automation job: ${job.id} for user ${jobData.userId}, job ${jobData.jobId}`);
    return job;
  } catch (error) {
    console.error('Failed to queue automation job:', error);
    throw error;
  }
}

export async function getQueueStats() {
  const waiting = await automationQueue.getWaiting();
  const active = await automationQueue.getActive();
  const completed = await automationQueue.getCompleted();
  const failed = await automationQueue.getFailed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}
