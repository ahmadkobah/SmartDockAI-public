/**
 * Logger utility for SmartDockAI
 * Provides structured logging with different levels and formats
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
};

class Logger {
    constructor(service = 'default') {
        this.service = service;
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
        this.logToFile = process.env.LOG_TO_FILE === 'true';
        this.logFile = path.join(logsDir, `${service}.log`);
    }

    shouldLog(level) {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
    }

    formatMessage(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            service: this.service,
            message,
            ...data
        };

        return JSON.stringify(logEntry);
    }

    writeLog(level, message, data = {}) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, data);
        
        // Console output with colors
        if (level === 'ERROR') {
            console.error(`\x1b[31m${formattedMessage}\x1b[0m`);
        } else if (level === 'WARN') {
            console.warn(`\x1b[33m${formattedMessage}\x1b[0m`);
        } else if (level === 'INFO') {
            console.info(`\x1b[32m${formattedMessage}\x1b[0m`);
        } else {
            console.log(formattedMessage);
        }

        // File output
        if (this.logToFile) {
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        }
    }

    error(message, data = {}) {
        this.writeLog('ERROR', message, data);
    }

    warn(message, data = {}) {
        this.writeLog('WARN', message, data);
    }

    info(message, data = {}) {
        this.writeLog('INFO', message, data);
    }

    debug(message, data = {}) {
        this.writeLog('DEBUG', message, data);
    }

    trace(message, data = {}) {
        this.writeLog('TRACE', message, data);
    }
}

// Create default logger instance
const logger = new Logger('smartdockai');

// Create service-specific loggers
const createLogger = (service) => new Logger(service);

module.exports = {
    logger,
    createLogger,
    Logger
};