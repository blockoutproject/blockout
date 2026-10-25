import * as Linking from "expo-linking";
import { ArrowUpRight } from "lucide-react-native";
import { useState } from "react";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";

/** Approved platform URL; a successful handoff never claims installation or changes admission. */
export interface StoreActionProps {
  url: string;
}

/** Opens the configured store through native Linking; failure retains an explicit new attempt. */
export function StoreAction({ url }: StoreActionProps) {
  return <StoreHandoff key={url} url={url} />;
}

/** Destination-scoped handoff lifecycle; replacing the configured URL discards its prior feedback. */
function StoreHandoff({ url }: StoreActionProps) {
  const [phase, setPhase] = useState<"idle" | "pending" | "failed">("idle");
  /** Performs one native handoff and leaves all access decisions with the complete-check owner. */
  async function open() {
    if (phase === "pending") return;
    setPhase("pending");
    try {
      await Linking.openURL(url);
      setPhase("idle");
    } catch {
      setPhase("failed");
    }
  }
  return (
    <>
      {phase === "failed" && <RequestError />}
      <Button
        fullWidth
        label={"Mettre à jour l’application"}
        onPress={() => void open()}
        loading={phase === "pending"}
        trailingIcon={ArrowUpRight}
      />
    </>
  );
}
