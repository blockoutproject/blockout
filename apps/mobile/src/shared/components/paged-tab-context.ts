import { createContext, useContext } from "react";
import type { DerivedValue } from "react-native-reanimated";

export const PagedTabContext = createContext<{
  contentInset: number;
  stickyInset: number;
  minContentHeight: number;
} | null>(null);

export const PagedTabCollapseContext =
  createContext<DerivedValue<number> | null>(null);

/** Reads the shared identity progress from expanded (0) to fully folded (1). */
export function usePagedTabCollapseProgress() {
  const progress = useContext(PagedTabCollapseContext);
  if (!progress) {
    throw new Error("A collapsible page header requires PagedTabs");
  }
  return progress;
}
