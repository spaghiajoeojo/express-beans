import { Executor } from '@/core/executor';

type AnyMethod<O = unknown> = (...args: unknown[]) => O;

/**
 * Assigns an execution order to a method
 * @param order {number}
 * @decorator
 */
export function Order<This, M extends AnyMethod>(
  order: number,
) {
  return (
    method: M,
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
