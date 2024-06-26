import { logger } from '@/core';
import Logger from '@/logging/Logger';

/**
 * Initializes a Logger with a specified prefix message
 * @decorator
 * @param scope {string}
 */
export function InjectLogger(scope?: string) {
  return (_value: any, _context: ClassFieldDecoratorContext) => () => {
    logger.debug(`initializing ${scope ?? 'anonymous'} logger`);
    return Logger(scope);
  };
}
