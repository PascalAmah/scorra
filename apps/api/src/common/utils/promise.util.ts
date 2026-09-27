/**
 * Reject after `ms` so a hung promise can never block an HTTP request or a
 * cron pass indefinitely.
 *
 * Used to bound `Queue.add()` against Redis: when the broker is unreachable,
 * ioredis keeps retrying and the returned promise may never settle, which
 * leaves the caller (an HTTP request) hanging forever.
 *
 * The timer is unref'd so a pending timeout never keeps the process alive.
 */
export function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
}

/**
 * Await `promise` but fail with `message` if it takes longer than `ms`.
 *
 * The original promise may still settle later; its rejection is swallowed so
 * it can't surface as an unhandled rejection.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const settled = Promise.resolve(promise);
  settled.catch(() => undefined);
  return Promise.race([settled, rejectAfter(ms, message)]);
}
