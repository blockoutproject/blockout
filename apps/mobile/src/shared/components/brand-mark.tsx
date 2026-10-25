import Svg, { Defs, Image as SvgImage, Mask, Rect } from "react-native-svg";
import { useTheme } from "../theme/theme-provider";

/** Decorative Blockout mark; the retained monochrome asset's luminance follows the current text color. */
export function BrandMark() {
  const { colors } = useTheme();
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" accessible={false}>
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
