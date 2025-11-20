import {
  registeredMethods, logger, registeredBeans,
} from '@/core';

const getMethods = (singleton: any) => Reflect.ownKeys(Object.getPrototypeOf(singleton))
  .filter((method) => method !== 'constructor')
  .map(methodName => [singleton[methodName], methodName] as const);

const isFunction = (functionToCheck: any): boolean => {
  return functionToCheck &&
    typeof functionToCheck === 'function' &&
    functionToCheck._beanUUID === undefined;
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
    getMapper: (_t: any, p: string) => {
      const mapper = mappers.get(p);
      if (mapper) {
        return mapper;
      }
      return (original: unknown) => {
        return original;
      };
    }
  };
  const instance: typeof target = Reflect.construct(target, []);
  const preComputedMethods = new Map<string | symbol, (...args: unknown[]) => any>();
  const singleton: any = new Proxy(instance, {
    get(targetProxy, prop) {
      const actualProp = Reflect.get(targetProxy, prop);
      if (isFunction(actualProp)) {
        if (preComputedMethods.has(prop)) {
          return preComputedMethods.get(prop);
        }
        const methodName = String(prop);
        let handlerFunction;

        handlerFunction = (...args: unknown[]) => {
          const result = handlerConfig.getInterceptor(targetProxy, methodName).apply(targetProxy, args);
          if (result instanceof Promise) {
            return result.then(res => handlerConfig.getMapper(targetProxy, methodName)(res));
          }
          return handlerConfig.getMapper(targetProxy, methodName)(result);
        };

        preComputedMethods.set(prop, handlerFunction);
        return handlerFunction;
      }
      return actualProp;
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
