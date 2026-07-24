import React from "react";
import { StyleSheet, View } from "react-native";

import {
  borderWidth,
  colors,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { Pill } from "@/src/shared/ui/pill";
import FadeIn from "@/src/shared/ui/animations/FadeIn";

/** En-tête de section présentant la date. */
export type MatchDateHeaderProps = {
  /** Libellé de la date. */
  title: string;
};

const MatchDateHeader: React.FC<MatchDateHeaderProps> = ({ title }) => {
  const theme = useAppTheme();

  return (
    <FadeIn>
      <View style={styles.wrapper}>
        <Pill
          label={title}
          leftIcon="calendar-blank-outline"
          size="md"
          borderWidth={borderWidth.thin}
          backgroundColor={theme.surfaceTertiary}
          borderColor={colors.ranking.silver}
          textColor={theme.text}
          labelStyle={typography.compactStrong}
        />
      </View>
    </FadeIn>
  );
};

export default React.memo(MatchDateHeader);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginVertical: spacing[2],
  },
});
