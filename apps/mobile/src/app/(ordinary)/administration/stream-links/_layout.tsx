import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { Stack } from "expo-router";
import { useSheetScreenOptions } from "@/shared/components/sheet";

/** Filters keep their short sheet; match and report readers use ordinary native stack pages. */
export default function ModerationLayout() {
  const screenOptions = useStackScreenOptions();
  const sheetOptions = useSheetScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="filters" options={sheetOptions} />
    </Stack>
  );
}
