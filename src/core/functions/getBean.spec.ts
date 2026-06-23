import { getBean } from '@/core/functions/getBean';

jest.mock('@/core', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getBean', () => {
  it('returns the singleton instance of a registered Bean', () => {
    // GIVEN
    class MyService {
      value = 42;
    }
    const T: any = MyService;
    T._beanUUID = crypto.randomUUID();
    T._instance = new MyService();
    T._className = MyService.name;

    // WHEN
    const instance = getBean(MyService);

    // THEN
    expect(instance).toBe(T._instance);
    expect(instance.value).toBe(42);
  });

  it('throws if class is not decorated with @Bean', () => {
    class NotABean {}

    expect(() => getBean(NotABean)).toThrow(
      'Cannot get instance from NotABean. Make sure that NotABean has @Bean as class decorator',
    );
  });

  it('throws if argument is null', () => {
    expect(() => getBean(null as any)).toThrow(
      'Please specify the type of Bean. Example: @InjectBean(BeanClass)',
    );
  });

  it('throws if argument has no name', () => {
    expect(() => getBean({ key: 'value' } as any)).toThrow(
      'Cannot get instance for {"key":"value"}: it is not an ExpressBean',
    );
  });
});
