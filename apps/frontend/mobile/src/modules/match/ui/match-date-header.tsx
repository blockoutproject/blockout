import React from "react";
import { StyleSheet, View } from "react-native";

import {
  borderWidth,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { Pill } from "@/src/shared/ui/pill";
import FadeIn from "@/src/shared/ui/animations/fade-in";

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
          borderColor={theme.borderSecondary}
          textColor={theme.text}
          style={styles.pill}
          labelStyle={typography.compactStrong}
        />
      </View>
    </FadeIn>
  );
};

export default React.memo(MatchDateHeader);

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    marginVertical: spacing[2],
  },
  pill: {
    alignSelf: "center",
  },
});
