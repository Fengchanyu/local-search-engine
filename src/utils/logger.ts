import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../types';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class FileLogger implements Logger {
  private logLevel: LogLevel;
  private logFile: fs.WriteStream | null = null;
  private logFilePath: string;

  constructor(logDir: string = './logs', logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
    this.logFilePath = path.join(logDir, `search-engine-${new Date().toISOString().split('T')[0]}.log`);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFile = fs.createWriteStream(this.logFilePath, { flags: 'a' });
  }

  private formatMessage(level: string, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ') : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}\n`;
  }

  private log(level: LogLevel, levelName: string, message: string, args: unknown[]): void {
    if (level < this.logLevel) return;
    
    const formatted = this.formatMessage(levelName, message, args);
    
    if (this.logFile) {
      this.logFile.write(formatted);
    }
    
    if (level >= LogLevel.WARN) {
      console.error(formatted.trim());
    } else if (level === LogLevel.INFO) {
      console.log(formatted.trim());
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'INFO', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, 'WARN', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, 'ERROR', message, args);
  }

  close(): void {
    if (this.logFile) {
      this.logFile.end();
      this.logFile = null;
    }
  }
}

class ConsoleLogger implements Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  private formatMessage(level: string, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ') : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, args));
    }
  }
}

export function createLogger(options: {
  type: 'file' | 'console';
  logDir?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}): Logger {
  const levelMap = {
    'debug': LogLevel.DEBUG,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR
  };
  
  const logLevel = levelMap[options.logLevel || 'info'];
  
  if (options.type === 'file') {
    return new FileLogger(options.logDir, logLevel);
  }
  
  return new ConsoleLogger(logLevel);
}

export { LogLevel, FileLogger, ConsoleLogger };
export type { Logger };
