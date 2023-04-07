import { logger, registeredBeans } from '@/decorators';

/**
 * Instantiates a new instance of the singleton and registers it
 * @decorator
 * @param target
 */
export function Bean(target: any) {
  logger.debug(`Registering singleton: ${target.name}`);
  Reflect.defineProperty(target, 'instance', {
    get: () => registeredBeans.get(target.name),
  });
  Reflect.defineProperty(target, 'isExpressBean', {
    get: () => true,
  });
  const singleton: any = Reflect.construct(target, []);
  singleton.className = target.name;
  registeredBeans.set(target.name, singleton);
}
