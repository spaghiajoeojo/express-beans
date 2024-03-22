import { ExpressBean } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/core';

/**
   * Hook a function to initialization phase.
   * @decorator
   */
export function Setup<This>(
  method: () => any,
  context: ClassMethodDecoratorContext<This, () => any>,
) {
  setImmediate(() => {
    const bean = registeredMethods.get(method) as ExpressBean;
    logger.debug(`Running setup function ${bean.className}.${String(context.name)}`);
    method.bind(bean)();
  });
  return method;
}
