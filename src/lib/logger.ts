type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Overrides the production-only filter and enables all log levels */
  enabled?: boolean;
  prefix?: string;
}

const isDev = import.meta.env.DEV;

function shouldLog(level: LogLevel): boolean {
  if (isDev) return true;
  return level === 'error';
}

function createLogger(options: LoggerOptions = {}) {
  const { prefix = '' } = options;

  const formatMessage = (message: string): string => {
    return prefix ? `[${prefix}] ${message}` : message;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (!shouldLog('debug')) return;
      console.debug(formatMessage(message), ...args);
    },

    info: (message: string, ...args: unknown[]) => {
      if (!shouldLog('info')) return;
      console.info(formatMessage(message), ...args);
    },

    warn: (message: string, ...args: unknown[]) => {
      if (!shouldLog('warn')) return;
      console.warn(formatMessage(message), ...args);
    },

    error: (message: string, ...args: unknown[]) => {
      if (!shouldLog('error')) return;
      console.error(formatMessage(message), ...args);
    },

    child: (childPrefix: string) => {
      const newPrefix = prefix ? `${prefix}:${childPrefix}` : childPrefix;
      return createLogger({ ...options, prefix: newPrefix });
    },
  };
}

export const logger = createLogger({ prefix: 'Bestiary' });

export function getLogger(moduleName: string) {
  return logger.child(moduleName);
}

export { createLogger };
