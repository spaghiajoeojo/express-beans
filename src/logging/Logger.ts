import pretty from 'pino-pretty';
import pino from 'pino';

export default function createLogger(scope?: string) {
  const logger = pino(
    {
      msgPrefix: `[${scope ?? 'ExpressBeans'}] `,
    },
    pretty({
      singleLine: true,
    }),
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
