import { AgeCorrectionSheet } from "../../features/privacy/components/age-correction-sheet";

/** Short correction sheet replaces privacy; it is never an independent full-screen age editor. */
export default function AgeCorrectionRoute() {
  return <AgeCorrectionSheet />;
}
