import pino from 'pino';

export function createLogger(scope?: string) {
  let options: pino.LoggerOptions = {};
  if (process.env.NODE_ENV === 'production') {
    options.redact = {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.headers["x-access-token"]',
        'res.headers.set-cookie',
      ],
      censor: '****',
    };
  } else {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    };
  }

  const logger = pino(
    {
      msgPrefix: `[${scope ?? 'ExpressBeans'}] `,
      ...options,
    },
  );
  switch (process.env.NODE_ENV) {
  case 'production':
    logger.level = 'info';
    break;
  case 'test':
    logger.level = 'silent';
    break;
  default:
    logger.level = 'debug';
  }
  return logger;
}
