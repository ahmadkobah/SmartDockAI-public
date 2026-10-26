
const queueService = require('./services/QueueService');

queueService.initialize()
  .then(() => {
    console.warn('🚀 SmartDockAI worker started and listening for jobs...');
  })
  .catch((err) => {
    console.error('❌ Worker failed to start:', err.message);
  });