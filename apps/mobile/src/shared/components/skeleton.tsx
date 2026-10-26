import { View, type DimensionValue } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Decorative UI Library Skeleton; the owning composition announces the pending read once. */
export function Skeleton({
  width = "100%",
  height = 16,
  shape = "text",
}: {
  width?: DimensionValue;
  height?: number;
  shape?: "text" | "rectangle";
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        maxWidth: "100%",
        height,
        borderRadius:
          shape === "text" ? tokens.radius.badge : tokens.radius.control,
        backgroundColor: colors.skeleton,
      }}
    />
  );
}
