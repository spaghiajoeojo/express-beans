import { flushPromises } from '@test/utils/testUtils';
import { isProxy } from 'util/types';
import { InjectBean } from '@/core/decorators/InjectBean';
import { Executor } from '@/core/executor';

jest.mock('@/core', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('InjectBean.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('injects a dependency', async () => {
    // GIVEN
    class TypeA {}
    const T: any = TypeA;
    T._beanUUID = crypto.randomUUID();
    T._instance = new TypeA();
    T._className = TypeA.name;

    // WHEN
    class Class {
      @InjectBean(TypeA)
      private dep: TypeA;

      getDep() {
        return this.dep;
      }
    }
    const instance = new Class();
    await flushPromises();

    // THEN
    expect(isProxy(instance.getDep())).toBe(true);
    expect((instance.getDep() as any)._beanUUID).toBe(T._beanUUID);
    expect.assertions(2);
  });

  it('injects multiple dependencies', async () => {
    // GIVEN
    class TypeA {}
    const TA: any = TypeA;
    TA._beanUUID = crypto.randomUUID();
    TA._instance = new TypeA();
    TA._className = TypeA.name;

    class TypeB {}
    const TB: any = TypeB;
    TB._beanUUID = crypto.randomUUID();
    TB._instance = new TypeB();
    TB._className = TypeB.name;

    // WHEN
    class Class {
      @InjectBean(TypeA)
        dep1: TypeA;

      @InjectBean(TypeB)
        dep2: TypeB;

      getDeps() {
        return [this.dep1, this.dep2];
      }
    }
    const instance = new Class();
    await flushPromises();

    // THEN
    const [dep1, dep2] = instance.getDeps();
    expect((dep1 as any)._beanUUID).toBe(TA._beanUUID);
    expect((dep2 as any)._beanUUID).toBe(TB._beanUUID);
  });

  it('throws an error if trying to inject a non injectable dependency', async () => {
    // GIVEN
    class TypeA {
      prop: string;
    }
    let instance;

    // WHEN
    expect(() => {
      class Class {
        @InjectBean(TypeA)
          dep: TypeA;
      }
      instance = new Class();
      expect((instance.dep as any).prop).not.toBeDefined();
    }).toThrow(new Error('Cannot get instance from TypeA. Make sure that TypeA has @Bean as class decorator'));
  });

  it('throws an error if trying to inject without specify a type', async () => {
    // GIVEN
    class TypeA {}
    let instance;

    // WHEN
    expect(() => {
      class Class {
        @InjectBean(null as any)
          dep: TypeA;
      }
      instance = new Class();
      expect((instance.dep as any).prop).not.toBeDefined();
    }).toThrow(new Error('Please specify the type of Bean. Example: @InjectBean(BeanClass)'));
  });

  it('throws an error when dependency is not found', async () => {
    // GIVEN
    class TypeA {
      prop: string;
    }
    class Class {
      @InjectBean(TypeA)
        dep: TypeA;

      getDep() {
        return this.dep;
      }
    }

    // WHEN
    let dep;
    await expect(async () => {
      const instance = new Class();
      dep = instance.getDep();
      await Executor.execution;
      // THEN
      expect(dep.prop).not.toBeDefined();
    }).rejects.toThrow(new Error('Cannot get instance from TypeA. Make sure that TypeA has @Bean as class decorator'));
  });

  it('throws an error if trying to use decorator improperly', async () => {
    // GIVEN
    class TypeA {}
    let instance;

    // WHEN
    expect(() => {
      class Class {
        @InjectBean({ key: 'value' })
          dep: TypeA;
      }
      instance = new Class();
      expect((instance.dep as any).key).not.toBeDefined();
    }).toThrow(new Error('Cannot get instance for {"key":"value"}: it is not an ExpressBean'));
  });

  it('proxies a dependency', async () => {
    // GIVEN
    class TypeA {
      prop: string = 'value';

      getProp() {
        return this.prop;
      }
    }
    const T: any = TypeA;
    T._beanUUID = crypto.randomUUID();
    T._instance = new TypeA();
    T._className = TypeA.name;

    // WHEN
    class Class {
      @InjectBean(TypeA)
      private dep: TypeA;

      getDep() {
        return this.dep;
      }

      getProp() {
        return this.dep.getProp();
      }
    }
    const instance = new Class();
    await flushPromises();

    // THEN
    expect(isProxy(instance.getDep())).toBe(true);
    expect((instance.getDep() as any)._beanUUID).toBe(T._beanUUID);
    expect(instance.getProp()).toBe('value');
    expect.assertions(3);
  });
});
