type Meta = Record<string, unknown>;

const write = (level: string, msg: string, meta?: Meta) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta }));

export const logger = {
  info: (msg: string, meta?: Meta) => write('info', msg, meta),
  warn: (msg: string, meta?: Meta) => write('warn', msg, meta),
  error: (msg: string, meta?: Meta) => write('error', msg, meta),
};
