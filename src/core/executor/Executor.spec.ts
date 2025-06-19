import { Executor } from '@/core/executor';
import { flushPromises } from '@test/utils/testUtils';
import { Task } from './Task';

describe('Executor.ts', () => {
  beforeEach(() => {
    Executor.stopLifecycle();
  });

  it.each([
    'start', 'register', 'routing', 'init', 'run',
  ] as const)('emits events when a phase is executed: %s', async (phase) => {
    // GIVEN
    const mock = jest.fn();
    Executor.on(phase, mock);

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase(phase);

    // THEN
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each([
    'start', 'register', 'routing', 'init', 'run',
  ] as const)('execute tasks when a phase is executed: %s', async (phase) => {
    // GIVEN
    const mock = jest.fn();
    Executor.setExecution(phase, () => mock());

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase(phase);

    // THEN
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('execute tasks in the defined sequence', async () => {
    // GIVEN
    const mock = jest.fn();
    Executor.setExecution('start', () => mock('start'));
    Executor.setExecution('register', () => mock('register'));
    Executor.setExecution('routing', () => mock('routing'));
    Executor.setExecution('init', () => mock('init'));
    Executor.setExecution('run', () => mock('run'));

    // WHEN
    Executor.startLifecycle();
    await flushPromises();
    await Executor.execution;

    // THEN
    expect(mock).toHaveBeenCalledTimes(5);
    expect(mock).toHaveBeenCalledWith('start');
    expect(mock).toHaveBeenCalledWith('register');
    expect(mock).toHaveBeenCalledWith('routing');
    expect(mock).toHaveBeenCalledWith('init');
    expect(mock).toHaveBeenCalledWith('run');
  });

  it('execute tasks with defined order', async () => {
    // GIVEN
    const mock = jest.fn();
    Executor.setExecution('init', () => mock(-1), 'key', -1);
    Executor.setExecution('init', () => mock(0), 'key', 0);
    Executor.setExecution('init', () => mock(1), 'key', 1);
    Executor.setExecution('init', () => mock(2), 'key', 2);
    Executor.setExecution('init', () => mock(3), 'key', 3);

    // WHEN
    Executor.startLifecycle();
    await flushPromises();
    await Executor.execution;

    // THEN
    expect(mock).toHaveBeenCalledTimes(5);
    expect(mock).toHaveBeenNthCalledWith(1, -1);
    expect(mock).toHaveBeenNthCalledWith(2, 0);
    expect(mock).toHaveBeenNthCalledWith(3, 1);
    expect(mock).toHaveBeenNthCalledWith(4, 2);
    expect(mock).toHaveBeenNthCalledWith(5, 3);
  });

  test('Executor get property', async () => {
    // GIVEN
    Executor.setExecution('start', () => {});
    Executor.setExecution('register', () => {});
    Executor.setExecution('routing', () => {});
    Executor.setExecution('init', () => {});
    Executor.setExecution('run', () => {});

    // THEN
    expect(Reflect.get(Executor, 'tasks')).toEqual(new Map([
      ['start', [expect.any(Task)]],
      ['register', [expect.any(Task)]],
      ['routing', [expect.any(Task)]],
      ['init', [expect.any(Task)]],
      ['run', [expect.any(Task)]],
    ]));
  });

  it('execute exit phase', async () => {
    // GIVEN
    const mock = jest.fn();
    Executor.setExecution('exit', () => mock());

    // WHEN
    Executor.startLifecycle();
    await flushPromises();
    await Executor.execution;
    Executor.stopLifecycle();

    // THEN
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('executes exit phase on process exit', async () => {
    // GIVEN
    const mockExit = jest.spyOn(process, 'exit')
      .mockImplementationOnce((code?: string | number | null) => process.emit('beforeExit', Number(code)) as never);
    const mock = jest.fn();
    Executor.setExecution('exit', () => mock());

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase('init');
    process.exit(0);

    // THEN
    expect(mock).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
  });

  it('executes exit phase on graceful shutdown', async () => {
    // GIVEN
    const mockExit = jest.spyOn(process, 'exit')
      .mockImplementationOnce((_code?: string | number | null) => undefined as never);
    const mock = jest.fn();
    Executor.setExecution('exit', () => mock());

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase('init');
    Reflect.get(Executor, 'gracefulShutdown').bind(Executor)();
    await Executor.getExecutionPhase('exit');
    await flushPromises();

    // THEN
    expect(mock).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
  });

  it('exposes phases', async () => {
    // THEN
    expect(Executor.PHASES).toEqual({
      0: 'start',
      1: 'register',
      2: 'routing',
      3: 'init',
      4: 'run',
      5: 'exit',
    });
  });
});
