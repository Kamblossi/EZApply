import { Router, Request, Response } from 'express';
import { automationQueue } from '../queues/automation';
import IORedis from 'ioredis';

const router = Router();

// Redis connection for pub/sub
const redis = new IORedis({
  host: 'localhost',
  port: 6379,
});

// SSE endpoint for real-time automation progress
router.get('/automation/:jobId/stream', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    jobId,
    timestamp: new Date().toISOString(),
    message: 'Connected to automation stream'
  })}\n\n`);
  
  try {
    // Get job status
    const job = await automationQueue.getJob(jobId);
    
    if (!job) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        jobId,
        timestamp: new Date().toISOString(),
        message: 'Job not found'
      })}\n\n`);
      res.end();
      return;
    }
    
    // Send current job state
    res.write(`data: ${JSON.stringify({
      type: 'status',
      jobId,
      timestamp: new Date().toISOString(),
      data: {
        id: job.id,
        progress: job.progress,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        opts: job.opts,
        data: job.data,
        returnvalue: job.returnvalue
      }
    })}\n\n`);
    
    // Send job logs
    const logs = await job.getLogsFromRedis();
    if (logs && logs.logs.length > 0) {
      logs.logs.forEach((log: string) => {
        res.write(`data: ${JSON.stringify({
          type: 'log',
          jobId,
          timestamp: new Date().toISOString(),
          message: log
        })}\n\n`);
      });
    }
    
    // Subscribe to job events via Redis pub/sub
    const subscriber = new IORedis({
      host: 'localhost',
      port: 6379,
    });
    
    const jobEventChannel = `bull:automation:${jobId}`;
    const queueEventChannel = 'bull:automation:*';
    
    await subscriber.subscribe(jobEventChannel, queueEventChannel);
    
    subscriber.on('message', async (channel, message) => {
      try {
        const eventData = JSON.parse(message);
        
        // Filter events for this specific job
        if (eventData.jobId === jobId || channel.includes(jobId)) {
          res.write(`data: ${JSON.stringify({
            type: 'event',
            jobId,
            timestamp: new Date().toISOString(),
            channel,
            data: eventData
          })}\n\n`);
        }
      } catch (error) {
        console.error('Error parsing Redis message:', error);
      }
    });
    
    // Periodically check job status and send updates
    const statusInterval = setInterval(async () => {
      try {
        const updatedJob = await automationQueue.getJob(jobId);
        if (updatedJob) {
          res.write(`data: ${JSON.stringify({
            type: 'progress',
            jobId,
            timestamp: new Date().toISOString(),
            data: {
              progress: updatedJob.progress,
              processedOn: updatedJob.processedOn,
              finishedOn: updatedJob.finishedOn,
              failedReason: updatedJob.failedReason
            }
          })}\n\n`);
          
          // Stop streaming if job is completed or failed
          if (updatedJob.finishedOn || updatedJob.failedReason) {
            res.write(`data: ${JSON.stringify({
              type: 'completed',
              jobId,
              timestamp: new Date().toISOString(),
              message: updatedJob.failedReason ? 'Job failed' : 'Job completed successfully'
            })}\n\n`);
            
            clearInterval(statusInterval);
            await subscriber.unsubscribe();
            subscriber.disconnect();
            res.end();
          }
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    }, 1000); // Check every second
    
    // Handle client disconnect
    req.on('close', async () => {
      clearInterval(statusInterval);
      await subscriber.unsubscribe();
      subscriber.disconnect();
      console.log(`Client disconnected from job ${jobId} stream`);
    });
    
    req.on('end', async () => {
      clearInterval(statusInterval);
      await subscriber.unsubscribe();
      subscriber.disconnect();
      console.log(`Stream ended for job ${jobId}`);
    });
    
  } catch (error) {
    console.error('SSE error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      jobId,
      timestamp: new Date().toISOString(),
      message: errorMessage
    })}\n\n`);
    res.end();
  }
});

// Get automation job status
router.get('/automation/:jobId/status', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await automationQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const logs = await job.getLogsFromRedis();
    
    res.json({
      id: job.id,
      progress: job.progress,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      data: job.data,
      returnvalue: job.returnvalue,
      logs: logs?.logs || []
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Start automation job
router.post('/automation/start', async (req: Request, res: Response) => {
  try {
    const { jobTitle, companyName, applicationId, ...otherData } = req.body;
    
    const jobData = {
      jobTitle: jobTitle || 'Software Developer',
      companyName: companyName || 'NHS',
      applicationId,
      ...otherData
    };
    
    const job = await automationQueue.add('nhsTracAutomation', {
      jobData
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    res.json({
      jobId: job.id,
      message: 'Automation job started',
      streamUrl: `/api/stream/automation/${job.id}/stream`
    });
  } catch (error) {
    console.error('Error starting automation job:', error);
    res.status(500).json({ error: 'Failed to start automation job' });
  }
});

// Get queue statistics
router.get('/automation/stats', async (req: Request, res: Response) => {
  try {
    const waiting = await automationQueue.getWaiting();
    const active = await automationQueue.getActive();
    const completed = await automationQueue.getCompleted();
    const failed = await automationQueue.getFailed();
    
    res.json({
      stats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
      jobs: {
        waiting: waiting.map(j => ({ id: j.id, data: j.data })),
        active: active.map(j => ({ id: j.id, progress: j.progress, data: j.data })),
        completed: completed.slice(0, 10).map(j => ({ 
          id: j.id, 
          finishedOn: j.finishedOn, 
          returnvalue: j.returnvalue,
          data: j.data 
        })),
        failed: failed.slice(0, 10).map(j => ({ 
          id: j.id, 
          failedReason: j.failedReason, 
          data: j.data 
        }))
      }
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

export default router;
