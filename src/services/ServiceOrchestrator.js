const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ServiceOrchestrator {
  constructor() {
    this.services = [];
    this.isShuttingDown = false;
    this.projectRoot = path.join(__dirname, '..', '..'); // Go up two levels from src/services to project root
    this.venvPython = path.join(this.projectRoot, '.venv', 'Scripts', 'python.exe');
  }

  /**
   * Check if Python virtual environment exists
   */
  checkVirtualEnvironment() {
    // Check for common virtual environment directory names
    const possibleVenvPaths = [
      path.join(this.projectRoot, 'venv', 'Scripts', 'python.exe'),
      path.join(this.projectRoot, '.venv', 'Scripts', 'python.exe'),
      path.join(this.projectRoot, 'env', 'Scripts', 'python.exe'),
      path.join(this.projectRoot, '.env', 'Scripts', 'python.exe')
    ];

    for (const venvPath of possibleVenvPaths) {
      if (fs.existsSync(venvPath)) {
        this.venvPython = venvPath;
        console.log(`✅ Found virtual environment at: ${venvPath}`);
        return true;
      }
    }

    console.log('⚠️  Virtual environment not found. Creating one...');
    return false;
  }

  /**
   * Start a single service
   */
  async startService(serviceName, command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting ${serviceName}...`);
      
      const service = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || this.projectRoot,
        env: { ...process.env, ...options.env },
        shell: true
      });

      service.stdout.on('data', (data) => {
        console.log(`[${serviceName}] ${data.toString().trim()}`);
      });

      service.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('INFO:') || output.includes('WARNING:')) {
          console.log(`[${serviceName}] ${output}`);
        } else {
          console.error(`[${serviceName}] ERROR: ${output}`);
        }
      });

      service.on('close', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`❌ ${serviceName} exited with code ${code}`);
          reject(new Error(`${serviceName} failed to start`));
        } else {
          console.log(`✅ ${serviceName} stopped gracefully`);
          resolve();
        }
      });

      service.on('error', (error) => {
        console.error(`❌ Failed to start ${serviceName}:`, error.message);
        reject(error);
      });

      // Store service reference for cleanup
      this.services.push({
        name: serviceName,
        process: service,
        pid: service.pid
      });

      // Give service time to start
      setTimeout(() => {
        if (service.pid) {
          console.log(`✅ ${serviceName} started with PID ${service.pid}`);
          resolve(service);
        }
      }, 2000);
    });
  }

  /**
   * Start React frontend
   */
  async startFrontend() {
    const clientPath = path.join(this.projectRoot, 'client');
    
    if (!fs.existsSync(path.join(clientPath, 'package.json'))) {
      throw new Error('React client not found');
    }

    return this.startService(
      'React Frontend',
      'npm',
      ['run', 'dev'],
      { cwd: clientPath }
    );
  }

  /**
   * Start Python OCR service
   */
  async startOCRService() {
    const servicePath = path.join(this.projectRoot, 'python-ocr-service');
    
    if (!fs.existsSync(path.join(servicePath, 'main.py'))) {
      throw new Error('OCR service not found');
    }

    return this.startService(
      'OCR Service',
      this.venvPython,
      ['main.py'],
      { 
        cwd: servicePath,
        env: { PYTHONPATH: servicePath }
      }
    );
  }

  /**
   * Start Python ICR service
   */
  async startICRService() {
    const servicePath = path.join(this.projectRoot, 'python-icr-service');
    
    if (!fs.existsSync(path.join(servicePath, 'main.py'))) {
      throw new Error('ICR service not found');
    }

    return this.startService(
      'ICR Service',
      this.venvPython,
      ['main.py'],
      { 
        cwd: servicePath,
        env: { PYTHONPATH: servicePath }
      }
    );
  }

  /**
   * Start Python NLP service
   */
  async startNLPService() {
    const servicePath = path.join(this.projectRoot, 'python-nlp-service');
    
    if (!fs.existsSync(path.join(servicePath, 'main.py'))) {
      throw new Error('NLP service not found');
    }

    return this.startService(
      'NLP Service',
      this.venvPython,
      ['main.py'],
      { 
        cwd: servicePath,
        env: { PYTHONPATH: servicePath }
      }
    );
  }

  /**
   * Start Python Document Intelligence service
   */
  async startIntelligenceService() {
    const servicePath = path.join(this.projectRoot, 'python-document-intelligence-service');
    
    if (!fs.existsSync(path.join(servicePath, 'main.py'))) {
      throw new Error('Document Intelligence service not found');
    }

    return this.startService(
      'Document Intelligence Service',
      this.venvPython,
      ['main.py'],
      { 
        cwd: servicePath,
        env: { PYTHONPATH: servicePath }
      }
    );
  }

  /**
   * Start Model Registry service
   */
  async startModelRegistryService() {
    const servicePath = path.join(this.projectRoot, 'model-registry-service');
    
    if (!fs.existsSync(path.join(servicePath, 'main.py'))) {
      throw new Error('Model Registry service not found');
    }

    return this.startService(
      'Model Registry Service',
      this.venvPython,
      ['main.py'],
      { 
        cwd: servicePath,
        env: { PYTHONPATH: servicePath }
      }
    );
  }

  /**
   * Start all services
   */
  async startAllServices() {
    console.log('🎯 Starting SmartDockAI - All Services');
    console.log('=====================================');

    try {
      // Check virtual environment
      if (!this.checkVirtualEnvironment()) {
        console.log('❌ Please create a Python virtual environment first');
        return false;
      }

      const servicesToStart = [
        { name: 'Frontend', method: 'startFrontend' },
        { name: 'OCR Service', method: 'startOCRService' },
        { name: 'ICR Service', method: 'startICRService' },
        { name: 'NLP Service', method: 'startNLPService' },
        { name: 'Document Intelligence', method: 'startIntelligenceService' },
        { name: 'Model Registry', method: 'startModelRegistryService' }
      ];

      // Start services with error handling
      for (const service of servicesToStart) {
        try {
          await this[service.method]();
          console.log(`✅ ${service.name} started successfully`);
        } catch (error) {
          console.log(`⚠️  ${service.name} failed to start: ${error.message}`);
          console.log(`   Continuing with other services...`);
        }
      }

      console.log('=====================================');
      console.log('🎉 SmartDockAI Services Started!');
      console.log('📱 Frontend: http://localhost:5173');
      console.log('🔧 Backend API: http://localhost:3000');
      console.log('📚 API Docs: http://localhost:3000/api-docs');
      console.log('=====================================');
      console.log('💡 Tip: Your React app has all active buttons ready!');
      console.log('Press Ctrl+C to stop all services');

      return true;
    } catch (error) {
      console.error('❌ Failed to start services:', error.message);
      await this.stopAllServices();
      return false;
    }
  }

  /**
   * Stop all services
   */
  async stopAllServices() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('\n🛑 Stopping all services...');

    for (const service of this.services) {
      try {
        if (service.process && !service.process.killed) {
          console.log(`⏹️  Stopping ${service.name}...`);
          
          // Try graceful shutdown first
          service.process.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!service.process.killed) {
              service.process.kill('SIGKILL');
            }
          }, 5000);
        }
      } catch (error) {
        console.error(`Error stopping ${service.name}:`, error.message);
      }
    }

    console.log('✅ All services stopped');
    process.exit(0);
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    process.on('SIGINT', () => {
      console.log('\n🔄 Received SIGINT, shutting down gracefully...');
      this.stopAllServices();
    });

    process.on('SIGTERM', () => {
      console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
      this.stopAllServices();
    });

    process.on('exit', () => {
      this.stopAllServices();
    });
  }
}

module.exports = ServiceOrchestrator;