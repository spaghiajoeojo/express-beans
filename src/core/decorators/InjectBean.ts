import { logger } from '@/core';
import { ExpressBean } from '@/ExpressBeansTypes';

function hasName(singletonClass: any) {
  return singletonClass.name;
}

function isABean(singletonClass: any) {
  return !!singletonClass._beanUUID && !!singletonClass._instance && !!singletonClass._className;
}

function getSingleton<T>(singletonClass: T): T {
  if (!singletonClass) {
    throw new Error('Please specify the type of Bean. Example: @InjectBean(BeanClass)');
  }

  if (!hasName(singletonClass)) {
    throw new Error(`Cannot get instance for ${JSON.stringify(singletonClass)}: it is not an ExpressBean`);
  }

  if (!isABean(singletonClass)) {
    const className = (singletonClass as any).name;
    throw new Error(`Cannot get instance from ${className}. Make sure that ${className} has @Bean as class decorator`);
  }

  const bean = singletonClass as unknown as ExpressBean;
  return bean._instance;
}

/**
 * Gets singleton instance by its static property
 * @decorator
 * @param singletonClass
 */
export function InjectBean<T extends object>(singletonClass: NonNullable<T>) {
  return (_value: unknown, _context: ClassFieldDecoratorContext) => () => new Proxy<T>(
    singletonClass ?? {},
    {
      get: (target, property) => {
        if (property === '_beanUUID' || property === '_className') {
          return (target as ExpressBean)[property];
        }
        const singletonInstance = getSingleton(singletonClass);
        const className = (singletonInstance as unknown as ExpressBean)._className;
        logger.debug(`proxying ${className}.${String(property)}`);
        return (singletonInstance as any)[property];
      },
    },
  ) as any;
}
