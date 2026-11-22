import { RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { Button } from "@/shared/components/button";

/** Only an explicit reload gives the empty card its own progress. */
export function CollectionEmptyReload({
  fetching,
  onReload,
}: Readonly<{
  fetching: boolean;
  onReload: () => Promise<unknown>;
}>) {
  const [requested, setRequested] = useState(false);

  async function reload() {
    if (requested) {
      return;
    }
    setRequested(true);
    try {
      await onReload();
    } finally {
      setRequested(false);
    }
  }

  return (
    <Button
      label="Actualiser"
      leadingIcon={RefreshCw}
      onPress={() => void reload()}
      loading={requested && fetching}
      disabled={requested && !fetching}
    />
  );
}
