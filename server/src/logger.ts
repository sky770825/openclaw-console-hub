import pino from 'pino';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { sanitize } from './utils/key-vault.js';

const isDev = process.env.NODE_ENV !== 'production';

// 確保日誌目錄存在
const logDir = path.join(os.homedir(), '.openclaw', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, 'server.log');

const targets = [];

// 開發模式下，同時輸出到美化的控制台
if (isDev) {
  targets.push({
    level: 'debug',
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
  });
}

// 無論什麼環境，都寫入到檔案
targets.push({
  level: process.env.LOG_LEVEL || 'info',
  target: 'pino/file',
  options: { destination: logPath, mkdir: true },
});

const _pino = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: { targets },
});

export const logger = _pino;

type LogFn = (...args: unknown[]) => void;

/** Wrap pino child into a console-compatible logger */
function wrapChild(child: pino.Logger) {
  const wrap = (level: 'info' | 'warn' | 'error' | 'debug'): LogFn =>
    (...args: unknown[]) => {
      if (args.length === 0) return;
      if (typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
        child[level](args[0] as Record<string, unknown>, ...args.slice(1).map(String));
        return;
      }
      const parts = args.map(a =>
        a instanceof Error ? a.message : (typeof a === 'string' ? a : JSON.stringify(a))
      );
      const errObj = args.find((a): a is Error => a instanceof Error);
      const msg = sanitize(parts.join(' '));
      if (errObj) {
        child[level]({ err: errObj }, msg);
      } else {
        child[level](msg);
      }
    };

  return {
    info: wrap('info'),
    warn: wrap('warn'),
    error: wrap('error'),
    debug: wrap('debug'),
    child: (bindings: Record<string, unknown>) => wrapChild(child.child(bindings)),
  };
}

/** Create a console-compatible structured logger with module context */
export function createLogger(module: string) {
  return wrapChild(_pino.child({ module }));
}
