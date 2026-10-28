import { Stack, useGlobalSearchParams } from "expo-router";
import { useAccountAdmission } from "../../../features/accounts/components/account-admission";
import { SupportJourney } from "../../../features/support/screens/support-journey";
import { sheetScreenOptions } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";

/** A direct choice link retains the ordinary support form behind its native sheet. */
export const unstable_settings = { anchor: "index" };

/** Owns one support visit across its form and choice routes, under the existing F12 protected ordinary group. */
export default function SupportLayout() {
  // The layout's local params exclude the leaf query; the journey captures this complete URL once.
  const params = useGlobalSearchParams();
  const admitted = useAccountAdmission();
  const { colors } = useTheme();
  return (
    <SupportJourney
      admitted={admitted}
      origin={{ ...params, screen: params.originScreen }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="choice"
          options={{
            ...sheetScreenOptions,
            sheetAllowedDetents: [0.5],
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </SupportJourney>
  );
}
