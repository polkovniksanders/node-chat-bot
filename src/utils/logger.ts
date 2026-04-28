type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configuredLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';

function fmt(level: LogLevel, msg: string, ctx?: object): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  return ctx ? `${base} ${JSON.stringify(ctx)}` : base;
}

export const logger = {
  debug(msg: string, ctx?: object): void {
    if (LEVELS[configuredLevel] <= 0) console.debug(fmt('debug', msg, ctx));
  },
  info(msg: string, ctx?: object): void {
    if (LEVELS[configuredLevel] <= 1) console.log(fmt('info', msg, ctx));
  },
  warn(msg: string, ctx?: object): void {
    if (LEVELS[configuredLevel] <= 2) console.warn(fmt('warn', msg, ctx));
  },
  error(msg: string, ctx?: object): void {
    console.error(fmt('error', msg, ctx));
  },
};
