import {
  registeredMethods, logger, registeredBeans,
} from '@/core';

const getMethods = (singleton: any) => Reflect.ownKeys(Object.getPrototypeOf(singleton))
  .filter((method) => method !== 'constructor')
  .map(methodName => [singleton[methodName], methodName] as const);

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

  const interceptors: Map<string, (target: unknown, prop: string) => unknown> = new Map();
  const mappers: Map<string, (original: unknown) => any> = new Map();

  const handlerConfig = {
    getInterceptor: (t: any, p: string) => {
      const interceptor = interceptors.get(p);
      if (interceptor) {
        return interceptor(t, p);
      }
      return t[p];
    },
    getMapper: (t: any, p: string) => {
      const mapper = mappers.get(p);
      if (mapper) {
        return mapper(t);
      }
      return (...args: unknown[]) => {
        return args;
      };
    }
  };
  const instance: typeof target = Reflect.construct(target, []);
  const preComputedMethods = new Map<string | symbol, (...args: unknown[]) => any>();
  const singleton: any = new Proxy(instance, {
    get(targetProxy, prop) {
      if (typeof targetProxy[prop] === 'function') {
        if (preComputedMethods.has(prop)) {
          return preComputedMethods.get(prop);
        }
        const handler = async (...args: unknown[]) => {
          const result = await Promise.resolve(handlerConfig.getInterceptor(targetProxy, prop as string).apply(targetProxy, args));
          const mapped = handlerConfig.getMapper(targetProxy, String(prop))(result);
          return mapped;
        };
        preComputedMethods.set(prop, handler);
        return handler;
      }
      return targetProxy[prop];
    }
  });
  Reflect.defineProperty(singleton, '_className', {
    get: () => target.name,
  });
  getMethods(instance)
    .forEach(([classMethod, methodName]) => {
      logger.debug(`registering method ${target.name}.${String(methodName)}`);
      registeredMethods.set(classMethod, singleton);
    });
  getMethods(singleton)
    .forEach(([classMethod, methodName]) => {
      logger.debug(`registering method ${target.name}.${String(methodName)}`);
      registeredMethods.set(classMethod, singleton);
    });
  Reflect.defineProperty(singleton, '_interceptors', {
    get: () => interceptors,
  });
  Reflect.defineProperty(singleton, '_mappers', {
    get: () => mappers,
  });
  registeredBeans.set(target.name, singleton);
}
