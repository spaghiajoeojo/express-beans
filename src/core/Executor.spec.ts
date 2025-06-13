import { Executor } from '@/core/Executor';

describe('Executor.ts', () => {
  beforeEach(() => {
    Executor.stopLifecycle();
  });

  it.each([
    'start', 'register', 'routing', 'init',
  ] as const)('emits events when a phase is executed: %s', async (phase) => {
    // GIVEN
    const mock = jest.fn();
    Executor.eventEmitter.on(phase, mock);

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase(phase);

    // THEN
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each([
    'start', 'register', 'routing', 'init',
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

    // WHEN
    Executor.startLifecycle();
    await Executor.getExecutionPhase('init');

    // THEN
    expect(mock).toHaveBeenCalledTimes(4);
    expect(mock).toHaveBeenCalledWith('start');
    expect(mock).toHaveBeenCalledWith('register');
    expect(mock).toHaveBeenCalledWith('routing');
    expect(mock).toHaveBeenCalledWith('init');
  });

  test('Executor proxy get property', async () => {
    // GIVEN
    Executor.setExecution('start', () => {});
    Executor.setExecution('register', () => {});
    Executor.setExecution('routing', () => {});
    Executor.setExecution('init', () => {});

    // THEN
    expect(Executor.tasks).toEqual(new Map([
      ['start', [expect.any(Function)]],
      ['register', [expect.any(Function)]],
      ['routing', [expect.any(Function)]],
      ['init', [expect.any(Function)]],
    ]));
  });

  it('exposes phases', async () => {
    // THEN
    expect(Executor.PHASES).toEqual({
      0: 'start',
      1: 'register',
      2: 'routing',
      3: 'init',
    });
  });
});
