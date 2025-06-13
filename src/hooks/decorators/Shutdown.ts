import { ExpressBean } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/core';
import { Executor } from '@/core/Executor';

/**
   * Hook a function right before the application is destroyed
   * @decorator
   */
export function Shutdown<This>(
  method: () => any,
  context: ClassMethodDecoratorContext<This, () => any>,
) {
  logger.debug(`Registering pre destroy function ${String(context.name)}`);
  Executor.setExecution('routing', () => {
    const bean = registeredMethods.get(method) as ExpressBean;
    logger.debug(`Initializing ${bean._className}.${String(context.name)} as pre destroy function`);
    Executor.setExecution('exit', () => method.bind(bean)());
  });

  return method;
}
