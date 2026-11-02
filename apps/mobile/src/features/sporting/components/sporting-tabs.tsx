import type { ReactNode } from "react";
import {
  PagedTabs,
  type PagedTabsProps,
} from "../../../shared/components/paged-tabs";

/** Sporting pages supply domain identity to the same shared paging composition as Home and Search. */
export interface SportingTabsProps extends Omit<
  PagedTabsProps,
  "collapsibleHeader"
> {
  identity: ReactNode;
}

/** The single identity card collapses; shared native adapters retain each scene's position. */
export function SportingTabs({ identity, ...props }: SportingTabsProps) {
  return <PagedTabs {...props} collapsibleHeader={identity} />;
}
