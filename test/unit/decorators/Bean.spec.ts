import { flushPromises } from '@test/utils/testUtils';
import { Bean } from '@/main';
import { registeredBeans } from '@/decorators';

jest.mock('@/decorators', () => ({
  registeredBeans: new Map(),
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
    expect(registeredBeans.get('Class')).toBe(C.instance);
    expect(C.instance.id).toStrictEqual(42);
  });
});
