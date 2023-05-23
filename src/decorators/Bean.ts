import { registeredMethods, logger, registeredBeans } from '@/decorators';

/**
 * Instantiates a new instance of the singleton and registers it
 * @decorator
 * @param target
 * @param _context
 */
export function Bean(target: any, _context: ClassDecoratorContext) {
  logger.debug(`Registering singleton: ${target.name}`);
  Reflect.defineProperty(target, 'instance', {
    get: () => registeredBeans.get(target.name),
  });
  Reflect.defineProperty(target, 'isExpressBean', {
    get: () => true,
  });

  const singleton: any = Reflect.construct(target, []);
  Reflect.ownKeys(Object.getPrototypeOf(singleton))
    .filter((method) => method !== 'constructor')
    .forEach((classMethod) => {
      logger.debug(`registering method ${String(classMethod)}`);
      if (typeof singleton[classMethod] === 'function') {
        registeredMethods.set(singleton[classMethod], singleton);
      }
    });
  singleton.className = target.name;
  registeredBeans.set(target.name, singleton);
}
