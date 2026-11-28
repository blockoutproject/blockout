import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SupportJourney } from "@/features/support/screens/support-journey";
import { useSheetScreenOptions } from "@/shared/components/sheet";

/** A direct choice link retains the ordinary support form behind its native sheet. */
export const unstable_settings = { anchor: "index" };

/** Owns one support visit across its form and choice routes, under the root's existing F12 public gates. */
export default function SupportLayout() {
  const screenOptions = useStackScreenOptions();
  // The layout's local params exclude the leaf query; the journey captures this complete URL once.
  const params = useGlobalSearchParams();
  const admitted = useAccessAdmission().ordinary;
  const sheetOptions = useSheetScreenOptions();
  return (
    <SupportJourney
      admitted={admitted}
      origin={{ ...params, screen: params.originScreen }}
    >
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="choice" options={sheetOptions} />
      </Stack>
    </SupportJourney>
  );
}
