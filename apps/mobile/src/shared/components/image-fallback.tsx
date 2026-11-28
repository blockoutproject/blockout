import { Image as ImageIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Neutral image symbol; the owning media slot retains sizing, background and read/loading/error behavior. */
export interface ImageFallbackProps {
  size?: number;
  color?: string;
  label?: string;
}

/** Reuses the standard image glyph for absent media instead of initials, an empty slot or a broken-image symbol. */
export function ImageFallback({
  size = tokens.size.icon.lg,
  color,
  label,
}: Readonly<ImageFallbackProps>) {
  const { colors } = useTheme();
  const icon = (
    <ImageIcon accessible={false} size={size} color={color ?? colors.icon} />
  );
  return label ? (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      {icon}
    </View>
  ) : (
    icon
  );
}
