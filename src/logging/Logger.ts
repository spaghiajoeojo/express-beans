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
  if (process.env.NODE_ENV !== 'production') {
    logger.level = 'debug';
  } else {
    logger.level = 'info';
  }
  return logger;
}
