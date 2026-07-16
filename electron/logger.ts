// Electron 日志模块：结构化日志记录
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// 日志文件路径（用户数据目录下）
const logDir = app.getPath('userData');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

// 获取当天日志文件路径
function getTodayLogFile(): string {
  const today = new Date().toISOString().split('T')[0];
  return path.join(logDir, `app-${today}.log`);
}

// 写入日志
function writeLog(entry: LogEntry): void {
  const logLine = JSON.stringify(entry) + '\n';
  fs.appendFileSync(getTodayLogFile(), logLine, 'utf-8');
}

// 记录日志
export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  writeLog(entry);

  // 同时输出到控制台
  if (level === 'error') {
    console.error(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  } else {
    console.log(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }
}

// 初始化全局错误处理
export function initGlobalErrorHandlers(): void {
  // 捕获未处理的异常
  process.on('uncaughtException', (error: Error) => {
    log('error', 'Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  });

  // 捕获未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason: unknown) => {
    log('error', 'Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  log('info', 'Global error handlers initialized');
}
