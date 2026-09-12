/**
 * @module StripeErrorHelpers
 *
 * Internal utilities for creating and converting StripeError objects.
 *
 * Security: Only `rehydrateBridgeError` can set sensitive fields
 * (paymentIntent, setupIntent, refund, apiError) from trusted native sources.
 *
 * @internal
 */
import type { StripeError } from '../types/StripeError';
/**
 * Runtime type guard to check if an object is a StripeError
 */
export declare function checkIfObjectIsStripeError(e: unknown): e is StripeError;
/**
 * Creates a StripeError for internal SDK use only.
 *
 * Security: Cannot set sensitive fields (paymentIntent, setupIntent, refund, etc).
 * Use `rehydrateBridgeError` to populate those from native bridge data.
 *
 * @internal
 */
export declare function createStripeError(init: Omit<StripeError, 'name' | 'stack' | 'nativeErrorCode' | 'metadata' | 'paymentIntent' | 'setupIntent' | 'refund' | 'apiError' | 'underlyingError'> & {
    nativeErrorCode?: string;
    metadata?: Record<string, unknown>;
}): StripeError;
/**
 * Rehydrates a plain object from the React Native bridge into a proper
 * StripeError instance (with Error.prototype in its prototype chain).
 *
 * The RN bridge serializes native errors (iOS NSDictionary / Android WritableMap)
 * into plain JS objects, losing the Error prototype. This function reconstructs
 * a real Error instance so that `error instanceof Error` returns true.
 *
 * Both iOS and Android produce a flat dictionary — no userInfo wrapper.
 * Only this function can populate sensitive fields (paymentIntent, setupIntent, etc.)
 * from bridge data.
 *
 * @internal
 */
export declare function rehydrateBridgeError(raw: unknown): StripeError;
