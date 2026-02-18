import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const _pino = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});

export const logger = _pino;

type LogFn = (...args: unknown[]) => void;

/** Wrap pino child into a console-compatible logger */
function wrapChild(child: pino.Logger) {
  const wrap = (level: 'info' | 'warn' | 'error' | 'debug'): LogFn =>
    (...args: unknown[]) => {
      if (args.length === 0) return;
      // If first arg is an object (not string), use pino's object-first form
      if (typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
        child[level](args[0] as Record<string, unknown>, ...args.slice(1).map(String));
        return;
      }
      // console-compatible: all args are message parts
      const parts = args.map(a =>
        a instanceof Error ? a.message : (typeof a === 'string' ? a : JSON.stringify(a))
      );
      const errObj = args.find((a): a is Error => a instanceof Error);
      if (errObj) {
        child[level]({ err: errObj }, parts.join(' '));
      } else {
        child[level](parts.join(' '));
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
