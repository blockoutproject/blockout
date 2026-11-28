import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

/** Native progress for caller-owned pending controls; the control retains its name and busy state. */
export function LoadingIndicator({
  color,
  style,
}: Readonly<{ color: string; style?: ActivityIndicatorProps["style"] }>) {
  return (
    <ActivityIndicator
      size="small"
      color={color}
      style={style}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
