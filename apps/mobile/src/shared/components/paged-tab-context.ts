import { createContext } from "react";

/** Library-measured clearances for the current tab; no feature or scroll state is mirrored. */
export const PagedTabContext = createContext<{
  contentInset: number;
  stickyInset: number;
} | null>(null);
