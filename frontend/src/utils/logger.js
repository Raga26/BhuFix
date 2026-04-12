/**
 * Frontend Logger Utility
 * Provides structured logging for frontend application with support for:
 * - Console logging with colors
 * - Local storage for offline logs
 * - Server-side log collection (optional)
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 */

const LOG_LEVELS = {
  DEBUG: { level: 0, color: '#6c757d', prefix: '🔍 DEBUG' },
  INFO: { level: 1, color: '#0d6efd', prefix: 'ℹ️  INFO' },
  WARN: { level: 2, color: '#ffc107', prefix: '⚠️  WARN' },
  ERROR: { level: 3, color: '#dc3545', prefix: '❌ ERROR' },
  SUCCESS: { level: 1, color: '#198754', prefix: '✓ SUCCESS' },
};

// Configuration
const CONFIG = {
  maxLogsInStorage: 500, // Maximum logs to keep in localStorage
  enableConsole: false, // Disabled - logs only go to Render backend
  enableStorage: false, // Disabled - logs go only to backend
  enableServer: true, // Send logs to backend for Render logs
  minLogLevel: process.env.NODE_ENV === 'production' ? 1 : 0, // 0=DEBUG in dev, 1=INFO in prod
  batchSize: 10, // Send logs in batches
  batchInterval: 5000, // Send every 5 seconds
};

class Logger {
  constructor() {
    this.logs = [];
    this.pendingLogs = []; // Pending logs to send to server
    this.sessionId = this.generateSessionId();
    this.startTime = performance.now();
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    
    // Start batch sending to server
    if (CONFIG.enableServer) {
      this.startBatchSending();
    }
    
    // Log application initialization
    this.info(`🚀 Frontend Application Started | Session: ${this.sessionId}`);
    this.info(`Environment: ${process.env.NODE_ENV}`);
    this.info(`Backend URL: ${this.backendUrl}`);
  }

  /**
   * Start periodic batch sending of logs to server
   */
  startBatchSending() {
    setInterval(() => {
      if (this.pendingLogs.length > 0) {
        this.flushLogsToServer();
      }
    }, CONFIG.batchInterval);
  }

  /**
   * Send accumulated logs to backend
   */
  async flushLogsToServer() {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      const response = await fetch(`${this.backendUrl}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
      });
      
      if (!response.ok) {
        console.warn(`Failed to send logs to server: ${response.status}`);
        // Re-add to pending if failed
        this.pendingLogs = logsToSend.concat(this.pendingLogs);
      }
    } catch (error) {
      console.warn('Failed to send logs to server:', error);
      // Re-add to pending if failed
      this.pendingLogs = logsToSend.concat(this.pendingLogs);
    }
  }

  /**
   * Generate a unique session ID for tracking related logs
   */
  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format log message with timestamp
   */
  formatLogEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(2);
    
    return {
      timestamp,
      level,
      message,
      data,
      sessionId: this.sessionId,
      url: window.location.pathname,
      elapsed,
    };
  }

  /**
   * Core logging method
   */
  log(level, message, data = null) {
    const logEntry = this.formatLogEntry(level, message, data);
    
    // Check log level
    if (LOG_LEVELS[level].level < CONFIG.minLogLevel) {
      return;
    }

    // Store in memory
    this.logs.push(logEntry);
    
    // Keep storage bounded
    if (this.logs.length > CONFIG.maxLogsInStorage) {
      this.logs.shift();
    }

    // Log to console
    if (CONFIG.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Send to server
    if (CONFIG.enableServer) {
      this.pendingLogs.push(logEntry);
      
      // Send immediately if batch size reached
      if (this.pendingLogs.length >= CONFIG.batchSize) {
        this.flushLogsToServer();
      }
    }
  }

  /**
   * Log to browser console with styling
   */
  logToConsole(logEntry) {
    const { level, message, data, elapsed } = logEntry;
    const levelConfig = LOG_LEVELS[level];
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    
    const consoleMessage = `${levelConfig.prefix} | ${timestamp} | +${elapsed}s | ${message}`;
    
    const style = `color: ${levelConfig.color}; font-weight: bold; font-family: monospace;`;
    
    if (data && Object.keys(data).length > 0) {
      console.log(`%c${consoleMessage}`, style, data);
    } else {
      console.log(`%c${consoleMessage}`, style);
    }
  }

  /**
   * Save logs to localStorage (disabled but kept for reference)
   */
  saveLogsToStorage() {
    // Disabled - logs sent to backend only
  }

  /**
   * Load logs from localStorage (disabled but kept for reference)
   */
  loadLogsFromStorage() {
    // Disabled - logs sent to backend only
    return [];
  }

  /**
   * Clear all stored logs and flush to server
   */
  clearLogs() {
    if (this.pendingLogs.length > 0) {
      this.flushLogsToServer();
    }
    this.logs = [];
    this.info('📋 Logs cleared and sent to server');
  }

  /**
   * Get all logs (useful for debugging)
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Export logs as JSON (for debugging/support)
   */
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhufix_logs_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.info('📥 Logs exported');
  }

  // Public logging methods
  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  success(message, data = null) {
    this.log('SUCCESS', message, data);
  }

  /**
   * Log component lifecycle events
   */
  componentMount(componentName, props = null) {
    this.info(`📦 Component Mounted: ${componentName}`, props);
  }

  componentUnmount(componentName) {
    this.info(`📦 Component Unmounted: ${componentName}`);
  }

  /**
   * Log API calls
   */
  apiRequest(method, path, data = null) {
    this.debug(`🌐 API REQUEST: ${method} ${path}`, data);
  }

  apiResponse(method, path, status, data = null) {
    const statusColor = status >= 400 ? 'error' : 'success';
    this[statusColor >= 400 ? 'warn' : 'success'](
      `🌐 API RESPONSE: ${method} ${path} | Status: ${status}`,
      data
    );
  }

  apiError(method, path, error) {
    this.error(`🌐 API ERROR: ${method} ${path}`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }

  /**
   * Log user interactions
   */
  userAction(action, details = null) {
    this.info(`👤 USER ACTION: ${action}`, details);
  }

  /**
   * Log form submissions
   */
  formSubmit(formName, data = null) {
    const sanitized = { ...data };
    // Mask sensitive fields
    if (sanitized?.password) sanitized.password = '***';
    if (sanitized?.email) sanitized.email = sanitized.email.substring(0, 3) + '***';
    
    this.info(`📝 Form Submitted: ${formName}`, sanitized);
  }

  /**
   * Measure performance
   */
  measurePerformance(label, callback) {
    const start = performance.now();
    const result = callback();
    const duration = ((performance.now() - start) / 1000).toFixed(3);
    this.debug(`⏱️  ${label}: ${duration}s`);
    return result;
  }

  /**
   * Send logs to server (can be implemented later)
   */
  async sendToServer(logEntry) {
    // This can be implemented when you have a log collection endpoint
    // Example:
    // try {
    //   await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/logs`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(logEntry),
    //   });
    // } catch (e) {
    //   console.warn('Failed to send log to server:', e);
    // }
  }
}

// Create singleton instance
const logger = new Logger();

// Make available globally for debugging in console
if (typeof window !== 'undefined') {
  window.__logger = logger;
  window.__logs = () => logger.getLogs();
  window.__exportLogs = () => logger.exportLogs();
  window.__clearLogs = () => logger.clearLogs();
}

export default logger;
