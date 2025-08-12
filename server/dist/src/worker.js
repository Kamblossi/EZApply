#!/usr/bin/env node
"use strict";
/**
 * Automation Worker Process
 *
 * This script starts the BullMQ worker for processing automation jobs.
 * Run this as a separate process alongside the main server.
 *
 * Usage:
 *   npm run worker
 *   or
 *   node dist/worker.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("./workers/automationWorker.js");
console.log('🤖 Automation worker started');
console.log('Worker is ready to process automation jobs...');
console.log('Press Ctrl+C to stop the worker');
