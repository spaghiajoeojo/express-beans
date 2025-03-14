import { flushPromises } from '@test/utils/testUtils';
import { Bean } from '@/main';
import { registeredBeans, registeredMethods } from '@/core';

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
    await flushPromises();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(C._instance.id).toStrictEqual(42);
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
    await flushPromises();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(registeredMethods.get(C._instance.getId)).toBe(C._instance);
  });
});
