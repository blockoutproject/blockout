import type { ReactNode } from "react";
import { EntryGroup } from "@/shared/components/entry-group";
import { ProEntry } from "./pro-entry";

/** Independent account entries follow Pro in the same navigation group. */
export interface ProProfileEntryProps {
  children?: ReactNode;
}

/** Keeps the existing profile group while the Pro owner presents the native paywall. */
export function ProProfileEntry({
  children,
}: Readonly<ProProfileEntryProps> = {}) {
  return (
    <EntryGroup>
      <ProEntry />
      {children}
    </EntryGroup>
  );
}
