import { flushPromises } from '@test/utils/testUtils';
import { Bean } from '@/main';
import { registeredBeans } from '@/decorators';

vi.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Bean.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

    // THEN
    expect(registeredBeans.get('Class')).toBe(C.instance);
    expect(C.instance.id).toStrictEqual(42);
  });
});
