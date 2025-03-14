import { logger } from '@/core';
import { ExpressBean } from '@/ExpressBeansTypes';

function getSingleton<T>(singletonClass: T & ExpressBean): T & ExpressBean {
  if (singletonClass) {
    if (singletonClass._instance) {
      return singletonClass._instance;
    }
    const className = Reflect.getOwnPropertyDescriptor(singletonClass, 'name')?.value;
    if (!className) {
      throw new Error(`Cannot get instance for a class without name: ${JSON.stringify(singletonClass)}`);
    }
    throw new Error(`Cannot get instance from ${className}. Make sure that ${className} has @Bean as class decorator`);
  }
  throw new Error('Please specify the type of Bean. Example: @InjectBean(BeanClass)');
}

/**
 * Gets singleton instance by its static property
 * @decorator
 * @param singletonClass
 */
export function InjectBean<T>(singletonClass: T) {
  return (_value: any, context: ClassFieldDecoratorContext) => () => {
    const singletonInstance = getSingleton(singletonClass as ExpressBean);
    logger.debug(`initializing ${String(context.name)} with instance of bean ${singletonInstance._className}`);
    return singletonInstance;
  };
}
