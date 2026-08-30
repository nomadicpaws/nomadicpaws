import type { ProxyEvent, Trace } from './';
export interface BatchPeek<T> {
    items: T[];
    bytes: number;
}
/**
 * Trace storage contract that `BatchUploader` depends on. Implemented
 * by `InMemoryCollector`; named as an interface to leave room for
 * future siblings (e.g. a persisted-to-disk collector for long offline
 * windows) without renaming the uploader's collaborator slot.
 */
export interface Collector {
    pushTrace(trace: Trace): void;
    pushProxyEvent(event: ProxyEvent): void;
    peekTraceEntries(maxBytes: number): BatchPeek<Trace>;
    peekProxyEventEntries(maxBytes: number): BatchPeek<ProxyEvent>;
    removeTraceEntries(count: number): void;
    removeProxyEventEntries(count: number): void;
}
/**
 * Bounded in-memory `Collector`. Holds an in-memory buffer for `Trace`
 * logs and one for `ProxyEvent` logs.
 *
 * Rejected pushes return silently — drop tracking is intentionally not
 * coupled to this layer.
 */
export declare class InMemoryCollector implements Collector {
    _traces: Trace[];
    _proxyEvents: ProxyEvent[];
    _traceBytes: number[];
    _proxyEventBytes: number[];
    _traceBufferedBytes: number;
    _proxyEventBufferedBytes: number;
    private readonly _maxTraceBufferedBytes;
    private readonly _maxProxyEventBufferedBytes;
    private readonly _maxEntryBytes;
    constructor(opts?: {
        maxTraceBufferedBytes?: number;
        maxProxyEventBufferedBytes?: number;
        maxEntryBytes?: number;
    });
    pushTrace(trace: Trace): void;
    pushProxyEvent(event: ProxyEvent): void;
    peekTraceEntries(maxBytes: number): BatchPeek<Trace>;
    peekProxyEventEntries(maxBytes: number): BatchPeek<ProxyEvent>;
    removeTraceEntries(count: number): void;
    removeProxyEventEntries(count: number): void;
}
