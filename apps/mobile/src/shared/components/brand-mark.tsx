import Svg, { Defs, Image as SvgImage, Mask, Rect } from "react-native-svg";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** The host selects the approved mark size; its original square asset and semantic ink stay unchanged. */
export interface BrandMarkProps {
  size?: number;
}

/** Decorative Blockout mark; the retained monochrome asset's luminance follows the current text color. */
export function BrandMark({
  size = tokens.size.brandMark,
}: Readonly<BrandMarkProps>) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
      <Defs>
        <Mask id="brand" maskType="luminance">
          <SvgImage
            href={require("../../../assets/brand-mark.png")}
            width={28}
            height={28}
          />
        </Mask>
      </Defs>
      <Rect width={28} height={28} fill={colors.text} mask="url(#brand)" />
    </Svg>
  );
}
