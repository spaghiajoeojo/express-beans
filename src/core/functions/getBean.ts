import { getSingleton } from '@/core/decorators/InjectBean';

/**
 * Returns the singleton instance of a registered Bean.
 * Can be used outside other Beans to access any registered instance.
 * @param singletonClass - The class decorated with @Bean
 * @returns The singleton instance of the given class
 * @throws Error if the class is not a registered Bean
 */
export function getBean<T>(singletonClass: new (...args: any[]) => T): T {
  return getSingleton(singletonClass) as T;
}
