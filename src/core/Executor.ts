import EventEmitter from 'events';
import { logger } from '@/core';
import {
  isError, Result, wrap,
} from '@/core/errors';

const phases = {
  0: 'start',
  1: 'register',
  2: 'routing',
  3: 'init',
  4: 'exit',
} as const;
export type ExecutorPhase = typeof phases[keyof typeof phases];

type ExecutorEventMap = {
  [phase in ExecutorPhase]: [Result<void>[]];
} & {
  error: [Error];
  finished: [];
};

class ExecutorImpl {
  static readonly PHASES = phases;

  tasks: Map<ExecutorPhase, Array<() => Promise<void> | void>> = new Map();

  eventEmitter = new EventEmitter<ExecutorEventMap>();

  phasePromises: Map<ExecutorPhase, Promise<Result<void>[]>> = new Map();

  started = false;

  execution: Promise<Result<void>[]> | null = null;



  /**
 * Registers a task to be executed in a given phase.
 * @param task {() => Promise<void> | void} function to be executed, can return a Promise or void
 * @param phase {ExecutorPhase} phase in which the task should be executed
 */
  setExecution(phase: ExecutorPhase, task: () => Promise<void> | void) {
    let phaseTasks = this.tasks.get(phase);
    if (!phaseTasks) {
      phaseTasks = [];
    }
    phaseTasks.push(task);
    this.tasks.set(phase, phaseTasks);
  }

  getExecutionPhase(phase: ExecutorPhase) {
    return this.phasePromises.get(phase) ?? new Promise((resolve) => {
      this.eventEmitter.once(phase, resolve);
    });
  }

  /**
 * Executes all registered tasks in a defined sequence based on phases.
 * Tasks are sorted by their phase index and executed concurrently within each phase.
 * Debug logs are generated for each phase indicating the number of tasks being executed.
 */
  async execute(): Promise<Result<void, Error>[]> {
    this.started = true;
    return Object.entries(phases)
      .filter(([, phase]) => phase !== 'exit')
      .map(([idx, phase]) => [Number(idx), phase] as const)
      .sort(([a], [b]) => a - b)
      .map(([, phase]) => phase)
      .reduce((
        previous: {
          promise: Promise<Result<void>[]>, phase: ExecutorPhase
        },
        currentPhase,
      ) => ({
        promise: previous.promise.then(
          async () => {
            await previous.promise;
            return this.executePhase(currentPhase);
          },
        ),
        phase: currentPhase,
      }), { promise: Promise.resolve<Result<void, Error>[]>([]), phase: 'start' })
      .promise;
  }

  /**
   * Executes all tasks in a given phase
   * @param phase {ExecutorPhase}
   * @returns {Promise<Result<void>[]>}
   */
  private async executePhase(phase: ExecutorPhase) {
    const tasksToExecute = this.tasks.get(phase) ?? [];
    logger.debug(`Executing phase ${phase} with ${tasksToExecute.length} tasks`);
    const wrappedTasks = tasksToExecute.map(async (task) => {
      const result = wrap(task);
      return Promise.resolve(result);
    });

    const resultMap = async (result: Result<void>, index: number) => {
      if (isError(result)) {
        logger.error(`Task ${index} in phase ${phase} failed`, { cause: result.error });
        this.eventEmitter.emit('error', result.error);
      }
      return result;
    };

    const phasePromise = Promise.all(wrappedTasks)
      .then((results) => Promise.all(results.map(resultMap)));

    this.phasePromises.set(phase, phasePromise);
    return phasePromise
      .then((result) => {
        this.eventEmitter.emit(phase, result);
        return result;
      });;
  }

  private beforeExit() {
    this.stopLifecycle();
  }

  /**
 * Starts the lifecycle of the ExpressBeans application.
 * If there are tasks to execute, they are executed in the defined sequence.
 * If execution is already in progress, the function does nothing.
 * @returns {void}
 */
  startLifecycle(): void {
    setImmediate(() => {
      if (this.started) {
        return;
      }
      logger.debug('Starting lifecycle');
      process.on('beforeExit', this.beforeExit.bind(this));
      this.execution = this.execute();
    });
  }

  /**
 * Stops the lifecycle of the ExpressBeans application.
 * All tasks are cleared and the lifecycle is stopped.
 * USE ONLY IF YOU KNOW WHAT YOU ARE DOING
 * @returns {Promise<void>}
 */
  async stopLifecycle(): Promise<void> {
    logger.debug('Stopping lifecycle');
    await this.executePhase('exit').then(() => {
      this.phasePromises.clear();
      this.tasks.clear();
      this.started = false;
      this.execution = null;
      this.eventEmitter.removeAllListeners();
      this.eventEmitter = new EventEmitter<ExecutorEventMap>();
      logger.debug('Lifecycle stopped');
      process.removeListener('beforeExit', this.beforeExit.bind(this));
    });
  }
}

type ExecutorType = typeof ExecutorImpl & ExecutorImpl;
let instance: ExecutorImpl | null = null;

function getInstance() {
  if (!instance) {
    instance = new ExecutorImpl();
  }
  return instance;
}

export const Executor: ExecutorType = new Proxy(ExecutorImpl, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }

    const inst = getInstance();
    const value = Reflect.get(inst, prop, inst);

    if (typeof value === 'function') {
      return value.bind(inst);
    }

    return value;
  },
}) as ExecutorType;
