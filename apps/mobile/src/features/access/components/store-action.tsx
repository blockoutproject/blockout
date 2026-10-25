import { ArrowUpRight } from "lucide-react-native";
import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { Button } from "../../../shared/components/button";

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
  const handoff = useNativeHandoff(url);
  return (
    <>
      <Button
        fullWidth
        label={"Mettre à jour l’application"}
        onPress={handoff.open}
        loading={handoff.pending}
        trailingIcon={ArrowUpRight}
      />
    </>
  );
}
