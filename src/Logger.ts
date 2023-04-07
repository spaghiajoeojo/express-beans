import pretty from 'pino-pretty';
import pino from 'pino';
import * as process from 'process';

export default class Logger {
  static create(scope: string) {
    const logger = pino(
      {
        msgPrefix: `[${scope}] `,
      },
      pretty({
        singleLine: true,
      }),
    );
    if (process.env.NODE_ENV !== 'production') {
      logger.level = 'debug';
    }
    return logger;
  }
}
