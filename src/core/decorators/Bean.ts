import { registeredMethods, logger, registeredBeans } from '@/core';

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
    get: () => crypto.randomUUID(),
  });

  const singleton: any = Reflect.construct(target, []);
  Reflect.ownKeys(Object.getPrototypeOf(singleton))
    .filter((method) => method !== 'constructor')
    .forEach((classMethod) => {
      logger.debug(`registering method ${target.name}.${String(classMethod)}`);
      registeredMethods.set(singleton[classMethod], singleton);
    });
  Reflect.defineProperty(singleton, '_className', {
    get: () => target.name,
  });
  registeredBeans.set(target.name, singleton);
}
