import React from "react";
import {StyleSheet, View} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {withAlpha} from "@/src/shared/lib/utils";
import InfoPillGradient from "@/src/shared/ui/chips/InfoPillGradient";
import FadeIn from "@/src/shared/ui/animations/FadeIn";

/** En-tête de section présentant la date. */
export type MatchDateHeaderProps = {
  /** Libellé de la date. */
  title: string;
};

const MatchDateHeader: React.FC<MatchDateHeaderProps> = ({title}) => {
  const theme = useAppTheme();

  return (
    <FadeIn>
      <View style={styles.wrapper}>
        <InfoPillGradient
          label={title}
          leftIcon="calendar-blank-outline"
          size="md"
          variant="filled"
          gradient={undefined}
          borderWidth={1}
          maxWidth={220}
          backgroundColor={withAlpha(theme.surfaceTertiary, 0.9)}
          borderColor={withAlpha(theme.text, 0.16)}
          textColor={theme.text}
          labelStyle={{
            fontSize: 14,
            fontWeight: "800",
          }}
        />
      </View>
    </FadeIn>
  );
};

export default React.memo(MatchDateHeader);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginVertical: 8,
  },
});
