import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import InfoPill from "@/src/components/common/chips/InfoPill";
import FadeIn from "@/src/components/common/animations/FadeIn";
import { PoolSummaryDTO } from "@/src/types/Pool";
import GradientBorderView from "../common/GradientBorderView";
import MaskedImage from "../common/images/MaskedImage";
import { GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";

export type FollowedPoolCardProps = {
    pool: PoolSummaryDTO;
    onPress: () => void;
    testID?: string;
    /** Hauteur du logo (pour uniformiser selon contexte). */
    logoSize?: number;
    /** Optionnel : radius de la carte */
    borderRadius?: number;
    /** Optionnel : padding interne */
    padding?: number;
    /** Optionnel : marge basse */
    marginBottom?: number;
};

const FollowedPoolCard: React.FC<FollowedPoolCardProps> = ({
    pool,
    onPress,
    testID,
    logoSize = 44,
    borderRadius = 16,
    padding = 12,
    marginBottom = 12,
}) => {
    const theme = useAppTheme();

    const title = pool.name;
    const division = pool.division;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;
    const chips = [
        pool.division.name ? { label: pool.division.name, icon: "trophy-variant" as const } : null,
        pool.season ? { label: pool.season, icon: "calendar-outline" as const } : null,
        pool.gender ? { label: GenderLabels[pool.gender] } : null,
        pool.format ? { label: FormatLabels[pool.format] } : null,
    ].filter(Boolean) as { label: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }[];

    return (
        <FadeIn>
            <Pressable
                onPress={onPress}
                testID={testID}
                style={{ marginBottom }}
            >
                <GradientBorderView
                    gradient={gradient}
                    borderRadius={borderRadius}
                    borderWidth={1}
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                            padding,
                        },
                    ]}
                >
                    <MaskedImage
                        uri={pool.division.logoUrl}
                        size={logoSize}
                        radius={12}
                        style={styles.logo}
                        shadow
                    />

                    <View style={styles.content}>
                        <Text
                            style={[styles.title, { color: theme.text }]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            lineBreakStrategyIOS="push-out"
                            textBreakStrategy="highQuality"
                        >
                            {title}
                        </Text>

                        {chips.length > 0 && (
                            <View style={[styles.chipsRow, { minWidth: 0 }]}>
                                {chips.map((chip, idx) => (
                                    <InfoPill
                                        key={`${chip.label}-${idx}`}
                                        label={chip.label}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </GradientBorderView>
            </Pressable>
        </FadeIn>
    );
};

export default FollowedPoolCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        marginRight: 10,
    },
    content: { flex: 1 },
    title: { fontSize: 14, fontWeight: "800" },
    chipsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        flexWrap: "nowrap",
        overflow: "hidden",
    },
});