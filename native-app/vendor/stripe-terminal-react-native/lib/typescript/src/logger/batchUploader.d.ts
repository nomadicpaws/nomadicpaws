import type { Collector } from './inMemoryCollector';
/**
 * Surfaced when `fetch` resolves with a non-2xx response. We turn the
 * `Response` into an error so the batch logic preserves the buffer for
 * retry instead of treating the upload as silently successful.
 */
export declare class HTTPError extends Error {
    status: number;
    constructor(status: number);
}
/**
 * Wrap a payload in the GatorService envelope. Top-level helper, called
 * directly from `BatchUploader.flush` — not injected, since there's
 * only ever one wire format and a builder param would add indirection
 * without value. `deviceUuid` is threaded through so requests can be
 * correlated server-side back to a single SDK instance.
 */
export declare function buildGatorRequest(method: 'reportTrace' | 'reportEvent', payload: object, deviceUuid: string): object;
export interface Uploader {
    send(request: object): Promise<Response>;
}
export interface Clock {
    now(): number;
}
export interface Scheduler {
    schedule(fn: () => void, ms: number): unknown;
    cancel(handle: unknown): void;
}
/**
 * Real `Uploader`: `fetch` with an `AbortController` enforcing
 * `FLUSH_TIMEOUT_MS`. The timer is always cleared in `finally` so a
 * resolved request doesn't leave a dangling abort scheduled.
 */
export declare class RealUploader implements Uploader {
    send(request: object): Promise<Response>;
}
export declare const realClock: Clock;
/**
 * Real `Scheduler`: `setTimeout` / `clearTimeout`. Kept as a class so
 * tests can swap in a `FakeScheduler` whose `runNext()` advances time
 * deterministically.
 */
export declare class RealScheduler implements Scheduler {
    schedule(fn: () => void, ms: number): unknown;
    cancel(handle: unknown): void;
}
/**
 * Verbose-gated console writer. The `isVerbose` closure is re-evaluated
 * on every call so `Logger.setLogLevel(...)` takes effect immediately,
 * without having to plumb the level through to existing instances.
 */
export declare class ConsoleWriter {
    private readonly _isVerbose;
    constructor(isVerbose: () => boolean);
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
}
/**
 * Owns scheduling, HTTP, and the verbose flush diagnostic. Holds a
 * reference to a `Collector` and drives drains via peek/remove.
 *
 * Each flush processes the trace batch fully (peek → upload → remove)
 * before touching the event batch. Serial — and one-batch-at-a-time —
 * because (a) both batches hit the same Gator endpoint so there's no
 * independent capacity to unlock by parallelizing, and (b) we don't
 * have to hold both peeked batches in memory at once.
 *
 * On failure the buffer is preserved (we don't call `removeXEntries`),
 * so the next flush retries the same prefix. On partial failure (e.g.
 * trace OK, event 5xx), only the failing batch is preserved. Note: the
 * event peek runs after the trace upload settles, so events pushed
 * during that window are eligible to drain in the same flush — slight
 * asymmetry vs traces, but Gator's two RPCs are independent so no
 * cross-batch ordering invariant is violated.
 */
export declare class BatchUploader {
    private readonly _collector;
    private readonly _uploader;
    private readonly _clock;
    private readonly _scheduler;
    private readonly _writer;
    private readonly _deviceUuid;
    private _isFlushing;
    constructor(opts: {
        collector: Collector;
        uploader: Uploader;
        clock: Clock;
        scheduler: Scheduler;
        writer: ConsoleWriter;
        deviceUuid: string;
    });
    /**
     * Drain a prefix of the trace and event queues to Gator. Public so
     * tests can drive a single flush deterministically; production calls
     * it via the self-rescheduling loop wired up in the constructor.
     */
    flush(): Promise<void>;
    private processTraceBatch;
    private processEventBatch;
    private flushSafe;
    private scheduleNext;
    private measure;
}
