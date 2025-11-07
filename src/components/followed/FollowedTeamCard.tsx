import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import InfoPill from "@/src/components/common/chips/InfoPill";
import FadeIn from "@/src/components/common/animations/FadeIn";
import { TeamSummaryDTO } from "@/src/types/Team";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import GradientBorderView from "../common/GradientBorderView";
import MaskedImage from "../common/images/MaskedImage";
import { GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";

export type FollowedTeamCardProps = {
    team: TeamSummaryDTO;
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

const FollowedTeamCard: React.FC<FollowedTeamCardProps> = ({
    team,
    onPress,
    testID,
    logoSize = 44,
    borderRadius = 16,
    padding = 12,
    marginBottom = 12,
}) => {
    const theme = useAppTheme();

    const title = team.name;
    const division = team.division;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;
    const chips = [
        team.division?.name ? { label: team.division.name, icon: "trophy-variant" as const } : null,
        team.season ? { label: team.season, icon: "calendar-outline" as const } : null,
        team.gender ? { label: GenderLabels[team.gender] } : null,
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
                        uri={team.club.logoUrl}
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

export default FollowedTeamCard;

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