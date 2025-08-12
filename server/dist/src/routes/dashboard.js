"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetrics = getDashboardMetrics;
exports.broadcastMetricsUpdate = broadcastMetricsUpdate;
exports.setupDashboardWebSocket = setupDashboardWebSocket;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Function to calculate dashboard metrics
function getDashboardMetrics(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Calculating dashboard metrics for user:', userId);
            // Get total jobs
            const jobsResult = yield db_1.db.query('SELECT COUNT(*) as total FROM jobs');
            console.log('Jobs query result:', jobsResult.rows[0]);
            // Get user's applications
            const applicationsResult = yield db_1.db.query('SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1', [userId]);
            console.log('Applications query result:', applicationsResult.rows[0]);
            // Get successful applications
            const successfulResult = yield db_1.db.query('SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status = $2', [userId, 'success']);
            console.log('Successful applications query result:', successfulResult.rows[0]);
            // Get running applications
            const runningResult = yield db_1.db.query('SELECT COUNT(*) as total FROM automation_runs WHERE user_id = $1 AND status IN ($2, $3)', [userId, 'pending', 'running']);
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
        }
        catch (error) {
            console.error('Error calculating dashboard metrics:', error);
            throw error;
        }
    });
}
// REST endpoint for dashboard metrics
router.get('/metrics', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log('Dashboard metrics request from user:', userId);
        if (!userId) {
            console.error('No user ID found in request');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const metrics = yield getDashboardMetrics(userId);
        console.log('Sending metrics response:', metrics);
        res.json(metrics);
    }
    catch (error) {
        console.error('Error getting dashboard metrics:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({ error: 'Failed to get dashboard metrics' });
    }
}));
// Function to broadcast metrics update to connected clients
function broadcastMetricsUpdate(io, userId) {
    getDashboardMetrics(userId)
        .then(metrics => {
        io.to(`user_${userId}`).emit('metrics_update', metrics);
    })
        .catch(error => {
        console.error('Error broadcasting metrics update:', error);
    });
}
// Setup WebSocket handling for dashboard metrics
function setupDashboardWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('Client connected to dashboard WebSocket');
        let authenticatedUserId = null;
        // Handle user authentication and room joining
        socket.on('authenticate', (token) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Verify the JWT token
                const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const userId = payload.id;
                authenticatedUserId = userId;
                socket.join(`user_${userId}`);
                // Send initial metrics
                const metrics = yield getDashboardMetrics(userId);
                socket.emit('metrics_update', metrics);
                console.log(`User ${userId} joined dashboard room`);
            }
            catch (error) {
                console.error('Error authenticating WebSocket user:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        }));
        // Handle manual metrics refresh
        socket.on('refresh_metrics', () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!authenticatedUserId) {
                    socket.emit('error', { message: 'Not authenticated' });
                    return;
                }
                const metrics = yield getDashboardMetrics(authenticatedUserId);
                socket.emit('metrics_update', metrics);
            }
            catch (error) {
                console.error('Error refreshing metrics:', error);
                socket.emit('error', { message: 'Failed to refresh metrics' });
            }
        }));
        socket.on('disconnect', () => {
            console.log('Client disconnected from dashboard WebSocket');
        });
    });
}
exports.default = router;
