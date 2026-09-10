import pino from 'pino';

export function createLogger(scope?: string, overrideLevel?: pino.LevelWithSilentOrString) {
  const options: pino.LoggerOptions = {};
  if ( process.env.NODE_ENV === 'production' ) {
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
  } else if ( process.env.NODE_ENV !== 'test' ) {
    // pino-pretty spawns a worker thread: skip it under test (NODE_ENV === 'test',
    // Jest's default) so a real logger doesn't leave a dangling handle that keeps
    // the process alive after the test run completes.
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
  if ( overrideLevel ) {
    logger.level = overrideLevel;
    return logger;
  }

  switch ( process.env.NODE_ENV ) {
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
