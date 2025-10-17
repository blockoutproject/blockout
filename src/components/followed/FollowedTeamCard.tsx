import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import FadeIn from "@/src/components/common/animations/FadeIn";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";
import { TeamSummaryDTO } from "@/src/types/Team";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";

export type FollowedTeamCardProps = {
    team: TeamSummaryDTO;
    onPress: () => void;
};

const FollowedTeamCard: React.FC<FollowedTeamCardProps> = ({ team, onPress }) => {
    const theme = useAppTheme();

    const gradient = [
        team.division.firstGradientColor,
        team.division.secondGradientColor,
        team.division.thirdGradientColor,
    ] as const;

    return (
        <FadeIn>
            <Pressable onPress={onPress} style={{ marginBottom: SECTION_SEPARATOR_HEIGHT, }}>
                <GradientBorderView
                    gradient={gradient}
                    borderRadius={16}
                    borderWidth={1}
                    style={[styles.card, { backgroundColor: theme.surface }]}
                >
                    <MaskedImage
                        uri={team.club.logoUrl}
                        size={44}
                        radius={10}
                        style={styles.logo}
                        shadow
                    />
                    <View style={styles.content}>
                        <Text
                            style={[styles.title, { color: theme.text }]}
                            numberOfLines={1}
                        >
                            {team.shortName || team.name}
                        </Text>

                        <InfoPillGradient
                            label={team.division.name}
                            gradient={gradient}
                            size="md"
                        />
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
        padding: 10,
        borderRadius: 16,
    },
    logo: {
        marginRight: 10,
    },
    content: {
        flex: 1,
        justifyContent: "center",
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 4,
    },
});