import { View, useWindowDimensions, type DimensionValue } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { Skeleton } from "./skeleton";

/** Published text silhouettes keep the loaded typography's line box and native text scale. */
export interface TextSkeletonProps {
  role?:
    | "metadata"
    | "label"
    | "body"
    | "navigation"
    | "title"
    | "heading"
    | "headingLarge"
    | "date";
  width?: DimensionValue;
}

const textRoles = {
  metadata: { lineHeight: tokens.typography.metadata.lineHeight, ink: 8 },
  label: { lineHeight: tokens.typography.label.lineHeight, ink: 9 },
  body: { lineHeight: tokens.typography.body.lineHeight, ink: 10 },
  navigation: { lineHeight: tokens.typography.navigation.lineHeight, ink: 11 },
  title: { lineHeight: tokens.typography.title.lineHeight, ink: 13 },
  heading: { lineHeight: tokens.typography.heading.lineHeight, ink: 14 },
  headingLarge: { lineHeight: tokens.typography.headingLg.lineHeight, ink: 17 },
  date: { lineHeight: tokens.typography.headingXl.lineHeight, ink: 23 },
};

/** One static ink bar sits inside the corresponding line box; its loading owner supplies the announcement. */
export function TextSkeleton({
  role = "body",
  width = "100%",
}: Readonly<TextSkeletonProps>) {
  const { fontScale } = useWindowDimensions();
  const { lineHeight, ink } = textRoles[role];
  return (
    <View
      style={{
        width,
        maxWidth: "100%",
        height: lineHeight * fontScale,
        justifyContent: "center",
      }}
    >
      <Skeleton height={ink * fontScale} />
    </View>
  );
}
