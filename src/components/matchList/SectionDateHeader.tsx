import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import InfoPill from "../common/chips/InfoPill";
import FadeIn from "../common/animations/FadeIn";

/** En-tête de section présentant la date. */
export type SectionDateHeaderProps = {
    /** Libellé de la date. */
    title: string;
};

const SectionDateHeader: React.FC<SectionDateHeaderProps> = ({ title }) => {
    const theme = useAppTheme();

    return (
        <FadeIn >
            <View
                style={styles.wrapper}
            >
                <InfoPill
                    style={{
                        width: 220
                    }}
                    label={title}
                    blurEnabled
                    blurTint="dark"
                    overlayAlpha={0.9}
                    overlayColor={theme.surfaceTertiary}
                    leftIconName="calendar-blank-outline"
                    leftIconSize={16}
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