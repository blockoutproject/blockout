import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import InfoPill from "../../common/chips/InfoPill";

/** En-tête de section présentant la date. */
export type SectionDateHeaderProps = {
    /** Libellé de la date. */
    title: string;
};

const SectionDateHeader: React.FC<SectionDateHeaderProps> = ({ title }) => {
    const theme = useAppTheme();

    return (
        <View
            style={styles.wrapper}
        >
            <InfoPill
                style={{
                    borderColor: withAlpha(theme.text, 0.2),
                }}
                label={title}
                blurEnabled
                blurTint="dark"
                overlayAlpha={0.7}
                overlayColor={theme.surfaceTertiary}
                leftIconName="calendar-blank-outline"
                leftIconSize={16}
                labelStyle={{
                    fontSize: 14,
                    fontWeight: "800",
                }}
                shadowEnabled
                shadowColor="#000"
                shadowLevel={5}
            />
        </View>
    );
};

export default SectionDateHeader;

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
});