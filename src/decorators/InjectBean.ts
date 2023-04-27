import { logger } from '@/decorators';

/**
 * Gets singleton instance by its static property
 * @decorator
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

export function InjectBean(singletonClass: any) {
  return (_value: any, context: ClassFieldDecoratorContext) => () => {
    logger.debug(`initializing ${String(context.name)} with instance of bean ${getSingleton(singletonClass).className}`);
    return getSingleton(singletonClass);
  };
}
