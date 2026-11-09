import type { ProState } from "./pro-state";

/** A customer read failure preserves an acknowledged association and its management/restore actions. */
export function hasAssociatedCustomer(state: ProState) {
  return (
    state.status === "active" ||
    state.status === "inactive" ||
    (state.status === "unavailable" && state.reason === "customer-info")
  );
}
