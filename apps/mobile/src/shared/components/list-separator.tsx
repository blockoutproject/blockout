import { View } from "react-native";
import { tokens } from "@/shared/theme/tokens";

/** LegendList may supply the leading row; separators only need the host's approved gap. */
export function ListSeparator({
  gap = tokens.layout.list.gap,
}: Readonly<{ gap?: number; leadingItem?: unknown }>) {
  return <View style={{ height: gap }} />;
}
