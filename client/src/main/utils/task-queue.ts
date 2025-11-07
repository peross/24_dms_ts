type Task<T> = () => Promise<T>;

export class TaskQueue {
  private current: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: Task<T>): Promise<T> {
    const result = this.current.then(task, task);
    this.current = result.catch(() => undefined);
    return result;
  }
}

