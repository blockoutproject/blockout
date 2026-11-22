import { SupportFlagAction } from "@/features/support";

/** Shared profile header action opens the existing support sheet without removing the underlying editor or its draft. */
export function ProfileSupportAction() {
  return (
    <SupportFlagAction label="Besoin d’aide ?" origin={{ screen: "profile" }} />
  );
}
