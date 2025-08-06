import express from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Function to calculate dashboard metrics
export async function getDashboardMetrics(userId: string) {
  try {
    // Get total jobs
    const jobsResult = await db.query(
      'SELECT COUNT(*) as total FROM jobs'
    );
    
    // Get user's applications
    const applicationsResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1',
      [userId]
    );
    
    // Get successful applications
    const successfulResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status = $2',
      [userId, 'success']
    );
    
    // Get running applications
    const runningResult = await db.query(
      'SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status IN ($2, $3)',
      [userId, 'pending', 'running']
    );

    const totalJobs = parseInt(jobsResult.rows[0].total);
    const totalApplications = parseInt(applicationsResult.rows[0].total);
    const successfulApplications = parseInt(successfulResult.rows[0].total);
    const runningApplications = parseInt(runningResult.rows[0].total);
    
    const successRate = totalApplications > 0 
      ? Math.round((successfulApplications / totalApplications) * 100) 
      : 0;

    return {
      totalJobs,
      totalApplications,
      successfulApplications,
      runningApplications,
      successRate,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    throw error;
  }
}

// REST endpoint for dashboard metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const metrics = await getDashboardMetrics(userId);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
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

    // Handle user authentication and room joining
    socket.on('authenticate', async (token: string) => {
      try {
        // Here you would verify the JWT token
        // For now, we'll assume the token contains the user ID
        const userId = 'user-id-from-token'; // Replace with actual token verification
        
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
    socket.on('refresh_metrics', async (data: { userId: string }) => {
      try {
        const userId = data.userId; // In production, get this from authenticated session
        const metrics = await getDashboardMetrics(userId);
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
