import { Executor } from '@/core/executor';

type AnyMethod = (...args: unknown[]) => unknown;

/**
 * Assigns an execution order to a method
 * @param order {number}
 * @decorator
 */
export function Order<This>(
  order: number,
) {
  return (
    method: AnyMethod,
    _context: ClassMethodDecoratorContext<This, AnyMethod>,
  ) => {
    Executor.setExecution('register', () => {
      const task = Executor.getTask(method);
      if (task) {
        task.order = order;
      } else {
        throw new Error('Method not registered for execution');
      }
    });
    return method;
  };
}
