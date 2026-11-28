import { Image } from "expo-image";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export interface BrandMarkProps {
  size?: number;
}

export function BrandMark({
  size = tokens.size.brandMark,
}: Readonly<BrandMarkProps>) {
  const { scheme } = useTheme();
  return (
    <Image
      accessible={false}
      source={
        scheme === "dark"
          ? require("../../../assets/brand-mark-white.svg")
          : require("../../../assets/brand-mark-black.svg")
      }
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
