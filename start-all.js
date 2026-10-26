#!/usr/bin/env node

/**
 * SmartDockAI Service Starter
 * 
 * This script starts all SmartDockAI services with one command:
 * - Main Node.js backend server
 * - React frontend (Vite dev server)
 * - Python OCR service
 * - Python ICR service  
 * - Python NLP service
 * - Python Document Intelligence service
 * - Python Model Registry service
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 SmartDockAI - Starting All Services');
console.log('=====================================');
console.log('📱 Frontend: http://localhost:5173');
console.log('🔧 Backend API: http://localhost:3000');
console.log('📚 API Docs: http://localhost:3000/api-docs');
console.log('=====================================');

// Set environment variable to auto-start all services
process.env.START_ALL_SERVICES = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start the main server which will orchestrate all other services
const serverPath = path.join(__dirname, 'src', 'server.js');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`\n👋 SmartDockAI stopped with code ${code}`);
  process.exit(code);
});

server.on('error', (error) => {
  console.error('❌ Failed to start SmartDockAI:', error.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down SmartDockAI...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down SmartDockAI...');
  server.kill('SIGTERM');
});