import { flushPromises } from '@test/utils/testUtils';
import { Bean } from '@/main';
import { registeredBeans, registeredMethods } from '@/core';
import { Executor } from '../executor/Executor';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Bean.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredBeans.clear();
    registeredMethods.clear();
  });

  it('registers a bean', async () => {
    // WHEN
    @Bean
    class Class {
      id = 42;
    }
    const C: any = Class;
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(C._instance.id).toStrictEqual(42);
    expect(C._beanUUID).toBeDefined();
    expect(C._className).toBe('Class');
  });

  it('registers a bean and its methods', async () => {
    // WHEN
    @Bean
    class Class {
      id: number = 1001;

      getId() {
        return 42;
      }
    }
    const C: any = Class;
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(registeredMethods.get(C._instance.getId)).toBe(C._instance);
    expect(C._beanUUID).toBeDefined();
    expect(C._className).toBe('Class');
  });

  it('applies interceptors and mappers', async () => {
    // WHEN
    @Bean
    class Class {
      id: number = 1001;

      getId() {
        return this.id;
      }
    }
    const C: any = Class;
    await flushPromises();
    await Executor.execute();

    // Adding interceptor and mapper
    C._instance._interceptors.set('getId', (_target: any, _prop: string) => {
      return function () {
        return 84;
      };
    });
    C._instance._mappers.set('getId', (original: any) => {
      return original * 2;
    });

    // THEN
    expect(C._instance.getId()).toBe(168); // (84 from interceptor) * 2 from mapper
  });

  it('applies interceptors and mappers on async methods', async () => {
    // WHEN
    @Bean
    class Class {
      id: number = 1001;

      async getId() {
        return this.id;
      }
    }
    const C: any = Class;
    await flushPromises();
    await Executor.execute();

    // Adding interceptor and mapper
    C._instance._interceptors.set('getId', (_target: any, _prop: string) => {
      return async function () {
        return 84;
      };
    });
    C._instance._mappers.set('getId', (original: any) => {
      return original * 2;
    });

    // THEN
    const result = await C._instance.getId();
    expect(result).toBe(168); // (84 from interceptor) * 2 from mapper
  });
});
