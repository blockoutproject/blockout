import { ArrowUpRight } from "lucide-react-native";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { Button } from "@/shared/components/button";

/** The approved platform URL is absent for the disabled preview action. */
export interface StoreActionProps {
  url?: string;
}

/** Opens the configured store through native Linking; failure retains an explicit new attempt. */
export function StoreAction({ url }: Readonly<StoreActionProps>) {
  return <StoreHandoff key={url} url={url} />;
}

/** Destination-scoped handoff lifecycle; replacing the configured URL discards its prior feedback. */
function StoreHandoff({ url }: Readonly<StoreActionProps>) {
  const handoff = useNativeHandoff(url);
  return (
    <Button
      fullWidth
      label="Mettre à jour l’application"
      onPress={handoff.open}
      disabled={!url}
      loading={handoff.pending}
      trailingIcon={url ? ArrowUpRight : undefined}
    />
  );
}
