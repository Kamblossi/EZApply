#!/usr/bin/env node

// Debug script to check port configuration
console.log('=== Electron Port Debug Script ===');
console.log('Environment Variables:');
console.log('MAIN_WINDOW_VITE_DEV_SERVER_URL:', process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Check if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';
console.log('Is Development:', isDev);

// Parse the dev server URL
const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || 'http://localhost:5173';
console.log('Dev Server URL:', devServerUrl);

// Parse port from URL
try {
  const url = new URL(devServerUrl);
  console.log('Parsed URL:', {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    href: url.href
  });
  
  if (url.port === '1') {
    console.error('❌ ERROR: Port is 1 - this is likely the issue!');
  } else {
    console.log('✅ Port appears to be correct:', url.port);
  }
} catch (error) {
  console.error('❌ Error parsing URL:', error);
}

// Check if port 5173 is available
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, 'localhost');
  });
}

async function checkPorts() {
  console.log('\n=== Port Availability Check ===');
  for (let port = 5173; port <= 5180; port++) {
    const available = await checkPort(port);
    console.log(`Port ${port}: ${available ? '✅ Available' : '❌ In use'}`);
  }
}

checkPorts().then(() => {
  console.log('\n=== Debug Complete ===');
});
