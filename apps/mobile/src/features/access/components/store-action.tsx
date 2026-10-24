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
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Performs one native handoff and leaves all access decisions with the complete-check owner. */
  async function open() {
    setOpening(true);
    try {
      await Linking.openURL(url);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setOpening(false);
    }
  }
  return (
    <>
      {failed && <RequestError />}
      <Button
        fullWidth
        label={"Mettre à jour l’application"}
        onPress={() => void open()}
        loading={opening}
        trailingIcon={ArrowUpRight}
      />
    </>
  );
}
