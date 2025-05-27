import { ExpressBean } from '@/ExpressBeansTypes';
import { logger, registeredMethods, setExecution } from '@/core';

/**
   * Hook a function to initialization phase.
   * @decorator
   */
export function Setup<This>(
  method: () => any,
  context: ClassMethodDecoratorContext<This, () => any>,
) {
  logger.debug(`Registering setup function ${String(context.name)}`);
  setExecution('decorate', () => {
    const bean = registeredMethods.get(method) as ExpressBean;
    logger.debug(`Initializing ${bean._className}.${String(context.name)} as setup function`);
    setExecution('init', () => method.bind(bean)());
  });

  return method;
}
