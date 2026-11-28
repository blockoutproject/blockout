import { StyleSheet, View } from "react-native";
import type { SportingDivisionResponse } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "@/shared/theme/theme-provider";

/** Approved division paint shared by previews, search cards and sporting resources. */
export function DivisionPaint({
  division,
}: Readonly<{
  division?: Pick<SportingDivisionResponse, "color" | "gradient">;
}>) {
  const { colors } = useTheme();
  const backgroundImage = division?.gradient
    ? `linear-gradient(120deg, ${division.gradient.join(", ")})`
    : division
      ? "linear-gradient(90deg, #00000000, #00000014)"
      : undefined;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: division?.color ?? colors.subtle, backgroundImage },
      ]}
    />
  );
}
