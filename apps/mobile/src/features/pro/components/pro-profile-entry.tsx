import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { EntryGroup } from "../../../shared/components/entry-group";
import { ProEntry } from "./pro-entry";

/** Independent account entries follow Pro in the same navigation group. */
export interface ProProfileEntryProps {
  children?: ReactNode;
}

/** Opens the Pro destination immediately; all SDK reads and recovery belong to that destination. */
export function ProProfileEntry({ children }: ProProfileEntryProps = {}) {
  const router = useRouter();
  return (
    <EntryGroup>
      <ProEntry onOpenPresentation={() => router.navigate("/pro")} />
      {children}
    </EntryGroup>
  );
}
