import { injections, logger } from '@/decorators';

/**
 * Gets singleton instance by its static property
 * @param singletonClass
 */
function getSingleton(singletonClass: any) {
  if (singletonClass) {
    if (singletonClass.instance) {
      return singletonClass.instance;
    }
    throw new Error(`Cannot get instance from ${singletonClass.name}. Make sure that ${singletonClass.name} has @Bean as class decorator`);
  }
  throw new Error('Please specify the type of Bean. Example: @InjectBean(BeanClass)');
}

function applyInjections(thisArg: any) {
  const toApply = injections
    .get(Object.getPrototypeOf(thisArg).constructor.name);
  if (!toApply) {
    throw new Error('Injection Failed');
  }
  const injectionList = Array.from(
    toApply.entries(),
  )
    .map(([property, singleton]) => ({ [property]: singleton }));
  Object.assign(thisArg, ...injectionList);
}

export function InjectBean(singletonClass?: any) {
  return (prototype: any, key: string) => {
    const injected: any = getSingleton(singletonClass);
    logger.debug(`Injected: ${injected.className} as ${prototype.constructor.name}.${key}`);
    /**
     * Intercept all calls in class methods to be sure that property is
     */
    Object.entries(Object.getOwnPropertyDescriptors(prototype))
      .filter(([, d]) => typeof d.value === 'function')
      .forEach(([method]) => {
        const value = prototype[method];
        let injectionList = injections.get(prototype.constructor.name);
        if (!injectionList) {
          injectionList = new Map();
          injections.set(prototype.constructor.name, injectionList);
        }
        injectionList.set(key, injected);
        if (value.__isProxy) {
          return;
        }
        Reflect.deleteProperty(prototype, method);
        Reflect.defineProperty(prototype, method, {
          value: new Proxy(value, {
            apply(target, thisArg, argumentsList) {
              applyInjections(thisArg);
              return target.bind(thisArg)(...argumentsList);
            },
          }),
        });
        prototype[method].__isProxy = true;
      });
  };
}
