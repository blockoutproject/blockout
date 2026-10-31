import { useRouter } from "expo-router";
import { Text } from "react-native";
import { Button } from "../../../shared/components/button";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Replaces the form only after complete receipt; subsequent exchanges remain outside the app by email. */
export function SupportConfirmation() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Surface>
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[tokens.typography.heading, { color: colors.text }]}
      >
        Demande reçue
      </Text>
      <Text style={[tokens.typography.body, { color: colors.text }]}>
        Nous vous répondrons par e-mail.
      </Text>
      <Button
        label="Terminer"
        fullWidth
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
    </Surface>
  );
}
