import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import FadeIn from "../common/animations/FadeIn";

/** En-tête de section présentant la date. */
export type SectionDateHeaderProps = {
    /** Libellé de la date. */
    title: string;
};

const SectionDateHeader: React.FC<SectionDateHeaderProps> = ({ title }) => {
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

export default React.memo(SectionDateHeader);

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        marginVertical: 8,
    },
});