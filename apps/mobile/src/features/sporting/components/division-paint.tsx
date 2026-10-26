import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { SportingDivisionResponse } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Approved division paint shared by previews, search cards and sporting resources. */
export function DivisionPaint({
  division,
}: {
  division?: Pick<SportingDivisionResponse, "color" | "gradient">;
}) {
  const { colors } = useTheme();
  const gradientId = useId();
  const gradient = division?.gradient;
  const stops = gradient
    ? gradient.map((color, index) => ({ color, offset: index / 2, opacity: 1 }))
    : [
        { color: "#000000", offset: 0, opacity: 0 },
        { color: "#000000", offset: 1, opacity: 0.08 },
      ];
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: division?.color ?? colors.subtle },
      ]}
    >
      {division && (
        <Svg
          accessible={false}
          width="100%"
          height="100%"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient
              id={gradientId}
              x1={0}
              y1={0}
              x2={1}
              y2={0}
              gradientUnits="userSpaceOnUse"
              // Inverse of the approved Figma gradient transform, in normalized bounds.
              gradientTransform={
                gradient
                  ? "matrix(0.866038 0.500022 -0.500022 0.866038 0.317008 -0.183008)"
                  : undefined
              }
            >
              {stops.map(({ color, offset, opacity }) => (
                <Stop
                  key={offset}
                  offset={offset}
                  stopColor={color}
                  stopOpacity={opacity}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width={1} height={1} fill={`url(#${gradientId})`} />
        </Svg>
      )}
    </View>
  );
}
