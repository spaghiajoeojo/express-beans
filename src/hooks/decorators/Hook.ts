import { ExpressBean } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/core';
import { Executor, ExecutorPhase } from '@/core/executor';

/**
   * Hook a function to a phase.
   * @decorator
   */
export function Hook(phase: ExecutorPhase) {
  return<This>(
    method: () => any,
    context: ClassMethodDecoratorContext<This, () => any>,
  ) => {
    logger.debug(`Registering ${phase} function ${String(context.name)}`);
    Executor.setExecution('start', () => {
      const bean = registeredMethods.get(method) as ExpressBean;
      logger.debug(`Initializing ${bean._className}.${String(context.name)} as ${phase} function`);
      Executor.setExecution(phase, () => method.bind(bean)(), method);
    });

    return method;
  };
}
