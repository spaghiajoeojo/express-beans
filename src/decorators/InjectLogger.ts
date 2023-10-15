import { logger } from '@/decorators';
import Logger from '@/Logger';

export function InjectLogger(scope?: string) {
  return (_value: any, _context: ClassFieldDecoratorContext) => () => {
    logger.debug(`initializing ${scope ?? 'anonymous'} logger`);
    return Logger(scope);
  };
}
