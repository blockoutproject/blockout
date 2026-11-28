import { Image } from "expo-image";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export interface BrandMarkProps {
  size?: number;
}

export function BrandMark({
  size = tokens.size.brandMark,
}: Readonly<BrandMarkProps>) {
  const { colors } = useTheme();
  return (
    <Image
      accessible={false}
      source={require("../../../assets/brand-mark.svg")}
      contentFit="contain"
      tintColor={colors.text}
      style={{ width: size, height: size }}
    />
  );
}
