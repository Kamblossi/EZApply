import express from 'express';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Function to calculate dashboard metrics
export async function getDashboardMetrics(userId: string) {
  try {
    console.log('Calculating dashboard metrics for user:', userId);
    
    // Get total jobs
    const jobsResult = await db.query(
      'SELECT COUNT(*) as total FROM jobs'
    );
    console.log('Jobs query result:', jobsResult.rows[0]);
    
    // Get user's applications
    const applicationsResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1',
      [userId]
    );
    console.log('Applications query result:', applicationsResult.rows[0]);
    
    // Get successful applications
    const successfulResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status = $2',
      [userId, 'success']
    );
    console.log('Successful applications query result:', successfulResult.rows[0]);
    
    // Get running applications
    const runningResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status IN ($2, $3)',
      [userId, 'pending', 'running']
    );
    console.log('Running applications query result:', runningResult.rows[0]);

    const totalJobs = parseInt(jobsResult.rows[0].total);
    const totalApplications = parseInt(applicationsResult.rows[0].total);
    const successfulApplications = parseInt(successfulResult.rows[0].total);
    const runningApplications = parseInt(runningResult.rows[0].total);
    
    const successRate = totalApplications > 0 
      ? Math.round((successfulApplications / totalApplications) * 100) 
      : 0;

    const result = {
      totalJobs,
      totalApplications,
      successfulApplications,
      runningApplications,
      successRate,
      timestamp: new Date().toISOString()
    };
    
    console.log('Dashboard metrics calculated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    throw error;
  }
}

// REST endpoint for dashboard metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('Dashboard metrics request from user:', userId);
    
    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const metrics = await getDashboardMetrics(userId);
    console.log('Sending metrics response:', metrics);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

// Function to broadcast metrics update to connected clients
export function broadcastMetricsUpdate(io: SocketIOServer, userId: string) {
  getDashboardMetrics(userId)
    .then(metrics => {
      io.to(`user_${userId}`).emit('metrics_update', metrics);
    })
    .catch(error => {
      console.error('Error broadcasting metrics update:', error);
    });
}

// Setup WebSocket handling for dashboard metrics
export function setupDashboardWebSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected to dashboard WebSocket');
    
    let authenticatedUserId: string | null = null;

    // Handle user authentication and room joining
    socket.on('authenticate', async (token: string) => {
      try {
        // Verify the JWT token
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };
        const userId = payload.id;
        authenticatedUserId = userId;
        
        socket.join(`user_${userId}`);
        
        // Send initial metrics
        const metrics = await getDashboardMetrics(userId);
        socket.emit('metrics_update', metrics);
        
        console.log(`User ${userId} joined dashboard room`);
      } catch (error) {
        console.error('Error authenticating WebSocket user:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Handle manual metrics refresh
    socket.on('refresh_metrics', async () => {
      try {
        if (!authenticatedUserId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        const metrics = await getDashboardMetrics(authenticatedUserId);
        socket.emit('metrics_update', metrics);
      } catch (error) {
        console.error('Error refreshing metrics:', error);
        socket.emit('error', { message: 'Failed to refresh metrics' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from dashboard WebSocket');
    });
  });
}

export default router;
