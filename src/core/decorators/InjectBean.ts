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
export function InjectBean<T>(singletonClass: NonNullable<T>) {
  return (_value: unknown, context: ClassFieldDecoratorContext) => () => {
    const singletonInstance = getSingleton(singletonClass);
    const className = (singletonInstance as unknown as ExpressBean)._className;
    logger.debug(`initializing ${String(context.name)} with instance of bean ${className}`);
    return singletonInstance as any;
  };
}
