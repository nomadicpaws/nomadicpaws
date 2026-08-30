export declare function stringifyRedacted(input: unknown): string;
/**
 * Deep-clones an object and replaces the values of sensitive fields with
 * a redaction placeholder. Handles nested objects, arrays, and raw string
 * arguments that match the client secret pattern.
 */
export declare function redactForLogging(input: unknown, parentKey?: string): unknown;
