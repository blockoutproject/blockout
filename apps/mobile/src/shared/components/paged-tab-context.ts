import { createContext, useContext } from "react";
import type { DerivedValue } from "react-native-reanimated";

export const PagedTabHeaderOffsetContext =
  createContext<DerivedValue<number> | null>(null);

/** Reads the vertical offset presented by the pager's fixed header. */
export function usePagedTabHeaderOffset() {
  const offset = useContext(PagedTabHeaderOffsetContext);
  if (!offset) {
    throw new Error("A collapsible page header requires PagedTabs");
  }
  return offset;
}
