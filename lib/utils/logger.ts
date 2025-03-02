/**
 * Centralized logger for the AgriSmart application
 * Provides consistent logging across all components
 */

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Environment-aware logging
const isDev = process.env.NODE_ENV === 'development';

// Interface for structured logging
interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: string;
  data?: Record<string, any>;
}

/**
 * Format a log entry for console output
 */
const formatLogEntry = (entry: LogEntry): string => {
  const { level, timestamp, message, context, data } = entry;
  const contextStr = context ? `[${context}] ` : '';
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  
  return `${timestamp} ${level.toUpperCase()} ${contextStr}${message}${dataStr}`;
};

/**
 * Create a timestamped log entry
 */
const createLogEntry = (
  level: LogLevel, 
  message: string, 
  context?: string, 
  data?: Record<string, any>
): LogEntry => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  context,
  data
});

/**
 * Console logger implementation
 * In production, this would be replaced with a more robust solution
 */
class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, data?: Record<string, any>): void {
    if (isDev) {
      const entry = createLogEntry('debug', message, this.context, data);
      console.debug(formatLogEntry(entry));
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: Record<string, any>): void {
    const entry = createLogEntry('info', message, this.context, data);
    console.info(formatLogEntry(entry));
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: Record<string, any>): void {
    const entry = createLogEntry('warn', message, this.context, data);
    console.warn(formatLogEntry(entry));
  }

  /**
   * Log error messages
   */
  error(message: string, error?: unknown, data?: Record<string, any>): void {
    const errorData = error instanceof Error 
      ? { 
          ...data,
          errorMessage: error.message,
          stack: error.stack,
        } 
      : data;
      
    const entry = createLogEntry('error', message, this.context, errorData);
    console.error(formatLogEntry(entry));
  }

  /**
   * Create a new logger with a nested context
   */
  child(context: string): Logger {
    const parentContext = this.context;
    const childContext = parentContext ? `${parentContext}.${context}` : context;
    return new Logger(childContext);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('agrismart');

/**
 * Create a logger for a specific component or module
 */
export const createLogger = (context: string): Logger => {
  return logger.child(context);
};

export default logger;
