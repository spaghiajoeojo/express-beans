import EventEmitter from 'events';
import { logger } from '@/core';

const phases = {
  0: 'start',
  1: 'register',
  2: 'decorate',
  3: 'init',
} as const;
export type ExecutorPhase = typeof phases[keyof typeof phases];

export class Executor {
  static PHASES = phases;

  static tasks: Map<ExecutorPhase, Array<() => Promise<void> | void>> = new Map();

  static eventEmitter = new EventEmitter();

  static phasePromises: Map<ExecutorPhase, Promise<void[]>> = new Map();

  static started = false;

  static execution: Promise<void[]> | null = null;

  /**
 * Registers a task to be executed in a given phase.
 * @param task {() => Promise<void> | void} function to be executed, can return a Promise or void
 * @param phase {ExecutorPhase} phase in which the task should be executed
 */
  static setExecution(phase: ExecutorPhase, task: () => Promise<void> | void) {
    if (!this.tasks.has(phase)) {
      this.tasks.set(phase, []);
    }
    this.tasks.get(phase)?.push(task);
  }

  static getExecutionPhase(phase: ExecutorPhase) {
    return this.phasePromises.get(phase) ?? new Promise((resolve) => {
      this.eventEmitter.once(phase, resolve);
    });
  }

  /**
 * Executes all registered tasks in a defined sequence based on phases.
 * Tasks are sorted by their phase index and executed concurrently within each phase.
 * Debug logs are generated for each phase indicating the number of tasks being executed.
 */
  static async execute(): Promise<void[]> {
    this.started = true;
    return Object.entries(phases)
      .map(([idx, phase]) => [Number(idx), phase] as const)
      .sort(([a], [b]) => a - b)
      .map(([, phase]) => phase)
      .reduce((previous: { promise: Promise<void[]>, phase: ExecutorPhase }, currentPhase) => ({
        promise: previous.promise.then(
          () => {
            this.eventEmitter.emit(previous.phase);
            const tasksToExecute = this.tasks.get(currentPhase) ?? [];
            logger.debug(`Executing phase ${currentPhase} with ${tasksToExecute.length} tasks`);
            const phasePromise = Promise.all(
              tasksToExecute.map((task) => {
                let res;
                try {
                  res = task();
                } catch (err) {
                  return Promise.reject(err);
                }
                if (res instanceof Promise) {
                  return res;
                }
                return Promise.resolve(res);
              }),
            );
            this.phasePromises.set(currentPhase, phasePromise);
            return phasePromise;
          },
        ),
        phase: currentPhase,
      }), { promise: Promise.resolve<void[]>([]), phase: 'start' })
      .promise
      .catch(((err) => {
        logger.error(err);
        throw err;
      }));
  }

  /**
 * Starts the lifecycle of the ExpressBeans application.
 * If there are tasks to execute, they are executed in the defined sequence.
 * If execution is already in progress, the function does nothing.
 * @returns {void}
 */
  static startLifecycle(): Promise<void[]> {
    if (this.execution) {
      return this.execution;
    }
    return new Promise((resolve) => {
      setImmediate(() => {
        if (this.started) {
          return;
        }
        logger.debug('Starting lifecycle');
        this.execution = this.execute();
        this.execution.then(resolve);
      });
    });
  }

  /**
 * Stops the lifecycle of the ExpressBeans application.
 * All tasks are cleared and the lifecycle is stopped.
 * USE ONLY IF YOU KNOW WHAT YOU ARE DOING
 * @returns {void}
 */
  static stopLifecycle(): void {
    logger.debug('Stopping lifecycle');
    this.phasePromises.clear();
    this.tasks.clear();
    this.started = false;
    this.execution = null;
    this.eventEmitter.removeAllListeners();
    logger.debug('Lifecycle stopped');
  }
}
