import type { ExecutorPhase } from './Executor';

export class Task {
  task: () => Promise<void> | void;
  phase: ExecutorPhase;
  order: number;

  constructor({
    task,
    phase,
    order = 0,
  }: {
    task: () => Promise<void> | void;
    phase: ExecutorPhase;
    order?: number;
  }) {
    this.task = task;
    this.phase = phase;
    this.order = order;
  }
}
