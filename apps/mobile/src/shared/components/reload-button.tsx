import { RefreshCw } from "lucide-react-native";
import { Button } from "./button";
import { useExplicitRead } from "./use-explicit-read";

/** Standard action for rereading confirmed empty content within its existing scope. */
export function ReloadButton({
  fetching,
  onReload,
  disabled = false,
}: Readonly<{
  fetching: boolean;
  onReload: () => Promise<unknown>;
  disabled?: boolean;
}>) {
  const { requested, progressing, read } = useExplicitRead(onReload, fetching);
  return (
    <Button
      label="Actualiser"
      leadingIcon={RefreshCw}
      onPress={() => void read()}
      loading={progressing}
      disabled={disabled || (requested && !progressing)}
    />
  );
}
