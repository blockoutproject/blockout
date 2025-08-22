import React, { memo } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { INFOCHIP_METRICS } from "./InfoChip";
import GradientView from "../GradientView";

type Props = {
    firstIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    secondIcon: React.ComponentProps<typeof Ionicons>["name"];
    gradient: readonly [string, string, ...string[]];
    onPress?: () => void;
    disabled?: boolean;
    maxWidth?: number;
    borderWidth?: number;
};

const InfoChipGradient: React.FC<Props> = memo(
    ({ firstIcon, secondIcon, gradient, onPress, disabled, maxWidth, borderWidth = 1 }) => {
        const theme = useAppTheme();
        const dv = borderWidth - INFOCHIP_METRICS.border;
        const padV = INFOCHIP_METRICS.vpad;
        const padH = INFOCHIP_METRICS.hpad;

        const content = (
            <View
                style={[
                    styles.inner,
                    { paddingVertical: padV, paddingHorizontal: padH, gap: 4 },
                ]}
            >
                <MaterialCommunityIcons name={firstIcon} size={14} color={theme.text} />
                <Ionicons name={secondIcon} size={14} color={theme.text} />
            </View>
        );

        return (
            <GradientView
                gradient={gradient}
                style={[
                    styles.outer,
                    { backgroundColor: theme.background },
                    
                ]}
            >
                {onPress ? (
                    <TouchableOpacity activeOpacity={0.5} onPress={onPress} disabled={disabled}>
                        {content}
                    </TouchableOpacity>
                ) : (
                    content
                )}
            </GradientView>
        );
    }
);

export default InfoChipGradient;

const styles = StyleSheet.create({
    outer: {
        borderRadius: INFOCHIP_METRICS.radius,
    },
    inner: {
        flexDirection: "row",
        alignItems: "center",
    },
    text: {
        fontSize: INFOCHIP_METRICS.fontSize,
        fontWeight: INFOCHIP_METRICS.fontWeight,
    },
});