const fs = require('fs-extra');
const path = require('path');

const LOG_LEVELS = {
    FATAL: { value: 0, name: 'FATAL', color: '\x1b[41m\x1b[37m' }, // Red bg, white text
    ERROR: { value: 1, name: 'ERROR', color: '\x1b[31m' }, // Red text
    WARN: { value: 2, name: 'WARN', color: '\x1b[33m' },  // Yellow text
    INFO: { value: 3, name: 'INFO', color: '\x1b[36m' },  // Cyan text
    DEBUG: { value: 4, name: 'DEBUG', color: '\x1b[90m' }  // Gray text
};

const RESET_COLOR = '\x1b[0m';

class Logger {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        // Check standard log level env var, fallback to INFO for production, DEBUG for dev
        this.currentLevel = process.env.LOG_LEVEL ?
            (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]?.value ?? 3) :
            (this.env === 'production' ? LOG_LEVELS.INFO.value : LOG_LEVELS.DEBUG.value);

        this.logDir = path.join(__dirname, '../logs');
        this.errorLogFile = path.join(this.logDir, 'error.log');
        this.combinedLogFile = path.join(this.logDir, 'combined.log');

        this.initDirs();
    }

    async initDirs() {
        try {
            await fs.ensureDir(this.logDir);
        } catch (err) {
            console.error('Failed to initialize log directory:', err);
        }
    }

    /**
     * Core logging function
     */
    _log(levelObj, message, context = {}) {
        if (levelObj.value > this.currentLevel) return;

        // Custom local timestamp format: YYYY-MM-DD HH:mm:ss
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        const cid = context.requestId ? ` [ReqID: ${context.requestId}]` : '';

        // 1. Console Output (Formatted for human readability)
        if (this.env !== 'test') {
            const prefix = `${levelObj.color}[${timestamp}] [${levelObj.name}]${cid}${RESET_COLOR}`;
            let consoleMsg = `${prefix} ${message}`;

            // Format Error objects cleanly in console
            if (context.error && context.error instanceof Error) {
                consoleMsg += `\n${levelObj.color}└─> ${context.error.stack || context.error.message}${RESET_COLOR}`;
            } else if (Object.keys(context).length > 0 && !context.error) {
                // Don't print the whole context if it's just the error we already handled
                const cleanContext = { ...context };
                delete cleanContext.requestId;
                if (Object.keys(cleanContext).length > 0) {
                    consoleMsg += `\n${levelObj.color}└─> Context: ${JSON.stringify(cleanContext)}${RESET_COLOR}`;
                }
            }

            // Redirect FATAL and ERROR to stderr
            if (levelObj.value <= LOG_LEVELS.ERROR.value) {
                console.error(consoleMsg);
            } else {
                console.log(consoleMsg);
            }
        }

        // 2. File Output (JSON format for ELK/Datadog integration)
        const logEntry = {
            timestamp,
            level: levelObj.name,
            message,
            ...context,
        };

        // Extract stack trace if error provided
        if (context.error && context.error instanceof Error) {
            logEntry.errorType = context.error.name;
            logEntry.errorMessage = context.error.message;
            logEntry.stack = context.error.stack;
            delete logEntry.error; // Remove raw error object before JSON stringify
        }

        const logString = JSON.stringify(logEntry) + '\n';

        // Write to files asynchronously (fire and forget to not block request)
        fs.appendFile(this.combinedLogFile, logString).catch(err => {
            console.error('Failed to write to combined log:', err);
        });

        // Save FATAL, ERROR, and WARN to error.log (includes 4xx operational errors)
        if (levelObj.value <= LOG_LEVELS.WARN.value) {
            fs.appendFile(this.errorLogFile, logString).catch(err => {
                console.error('Failed to write to error log:', err);
            });
        }
    }

    fatal(message, context = {}) { this._log(LOG_LEVELS.FATAL, message, context); }
    error(message, context = {}) { this._log(LOG_LEVELS.ERROR, message, context); }
    warn(message, context = {}) { this._log(LOG_LEVELS.WARN, message, context); }
    info(message, context = {}) { this._log(LOG_LEVELS.INFO, message, context); }
    debug(message, context = {}) { this._log(LOG_LEVELS.DEBUG, message, context); }
}

module.exports = new Logger(); // Export a singleton instance
