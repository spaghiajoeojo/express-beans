import {
  registeredMethods, logger, registeredBeans,
} from '@/core';
import { Executor } from '@/core/Executor';

/**
 * Creates a proxy for a class method
 * @param singleton
 * @param classMethod
 */
const proxyMethod = (singleton: any, classMethod: PropertyKey): void => {
  logger.debug(`creating proxy for ${singleton._className}.${String(classMethod)}`);
  Reflect.defineProperty(singleton, classMethod, {
    value: new Proxy(singleton[classMethod], {
      get: (instance, actualMethod) => {
        logger.debug(`proxying ${instance._className}.${String(actualMethod)}`);
        return async (...args: any[]) => {
          logger.debug(`Executing ${instance._className}.${String(actualMethod)}`);
          await Executor.getExecutionPhase('init');
          const result = await instance[actualMethod](...args);
          return result;
        };
      },
    }),
  });
};

/**
 * Instantiates a new instance of the singleton and registers it
 * @decorator
 * @param target
 * @param _context
 */
export function Bean(target: any, _context: ClassDecoratorContext) {
  logger.debug(`Registering singleton: ${target.name}`);
  Reflect.defineProperty(target, '_className', {
    get: () => target.name,
  });
  Reflect.defineProperty(target, '_instance', {
    get: () => registeredBeans.get(target.name),
  });
  Reflect.defineProperty(target, '_beanUUID', {
    value: crypto.randomUUID(),
  });

  const singleton: any = Reflect.construct(target, []);
  Reflect.defineProperty(singleton, '_className', {
    get: () => target.name,
  });
  Reflect.ownKeys(Object.getPrototypeOf(singleton))
    .filter((method) => method !== 'constructor')
    .forEach((classMethod) => {
      logger.debug(`registering method ${target.name}.${String(classMethod)}`);
      registeredMethods.set(singleton[classMethod], singleton);
      proxyMethod(singleton, classMethod);
    });
  registeredBeans.set(target.name, singleton);
}
