import { flushPromises } from '@test/utils/testUtils';
import { InjectBean } from '@/main';
import { injections } from '@/decorators';

vi.mock('@/decorators', () => ({
  injections: new Map(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InjectBean.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    injections.clear();
  });

  it('injects a dependency', async () => {
    // GIVEN
    class TypeA {}
    const T: any = TypeA;
    T.instance = new TypeA();

    // WHEN
    class Class {
      @InjectBean(TypeA)
        dep!: TypeA;

      getDep() {
        return this.dep;
      }
    }
    const instance = new Class();
    await flushPromises();

    // THEN
    expect(instance.getDep()).toBe(T.instance);
  });

  it('injects multiple dependencies', async () => {
    // GIVEN
    class TypeA {}
    const TA: any = TypeA;
    TA.instance = new TypeA();

    class TypeB {}
    const TB: any = TypeB;
    TB.instance = new TypeB();

    // WHEN
    class Class {
      @InjectBean(TypeA)
        dep1!: TypeA;

      @InjectBean(TypeB)
        dep2!: TypeB;

      getDeps() {
        return [this.dep1, this.dep2];
      }
    }
    const instance = new Class();
    await flushPromises();

    // THEN
    const [dep1, dep2] = instance.getDeps();
    expect(dep1).toBe(TA.instance);
    expect(dep2).toBe(TB.instance);
  });

  it('throws an error if trying to inject a non injectable dependency', async () => {
    // GIVEN
    class TypeA {}
    let instance;

    // WHEN
    expect(() => {
      class Class {
        @InjectBean(TypeA)
          dep!: TypeA;
      }
      instance = new Class();
    }).toThrow(new Error('Cannot get instance from TypeA. Make sure that TypeA has @Bean as class decorator'));
    expect(instance).toBe(undefined);
  });

  it('throws an error if trying to inject without specify a type', async () => {
    // GIVEN
    class TypeA {}
    let instance;

    // WHEN
    expect(() => {
      class Class {
        @InjectBean(null)
          dep!: TypeA;
      }
      instance = new Class();
    }).toThrow(new Error('Please specify the type of Bean. Example: @InjectBean(BeanClass)'));
    expect(instance).toBe(undefined);
  });

  it('throws an error when dependency is not found', async () => {
    // GIVEN
    class TypeA {}
    const T: any = TypeA;
    T.instance = new TypeA();
    class Class {
      @InjectBean(TypeA)
        dep!: TypeA;

      getDep() {
        return this.dep;
      }
    }
    injections.clear();
    const instance = new Class();

    // WHEN
    let dep;
    expect(() => {
      dep = instance.getDep();
    }).toThrow(new Error('Injection Failed'));

    // THEN
    expect(dep).toBe(undefined);
  });
});
