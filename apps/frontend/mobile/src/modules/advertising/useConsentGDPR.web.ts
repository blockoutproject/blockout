/**
 * Advertising consent is a native-only boundary.
 *
 * The web build exists only as a local characterization surface, so it must
 * never initialize the native advertising SDK.
 */
export function useConsentGDPR() {
}
