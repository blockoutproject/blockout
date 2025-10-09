import React from "react";
import { Text, View, Pressable, StyleSheet, DimensionValue } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import InfoPill from "@/src/components/common/chips/InfoPill";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FadeIn from "../common/animations/FadeIn";

export type SearchCardChip = {
    label: string;
    icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    maxWidth?: DimensionValue;
    labelStyle?: any;
};

export type SearchCardProps = {
    /** Titre principal (nom d’équipe, de club, de poule, etc.). */
    title: string;
    /** URL du logo si disponible. */
    imageUri?: string | null;
    /** Fallback local si pas d’URL (require). */
    fallbackImage: any;
    /** Liste des chips (une seule ligne, troncature si besoin). */
    chips?: SearchCardChip[];
    /** Handler press. */
    onPress: () => void;
    /** Pour tester (e2e). */
    testID?: string;
    /** Ajuste le fit de l’image (contain recommandé pour logos). */
    contentFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
    /** Hauteur du logo (pour uniformiser selon contexte). */
    logoSize?: number;
    /** Rayon des coins de la carte. */
    borderRadius?: number;
    /** Padding interne. */
    padding?: number;
    /** Marge basse. */
    marginBottom?: number;
};

const SearchCard: React.FC<SearchCardProps> = ({
    title,
    imageUri,
    fallbackImage,
    chips = [],
    onPress,
    testID,
    contentFit = "contain",
    logoSize = 44,
    borderRadius = 16,
    padding = 12,
    marginBottom = 12,
}) => {
    const theme = useAppTheme();

    return (
        <FadeIn>
            <Pressable
                onPress={onPress}
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.surface,
                        shadowColor: theme.background,
                        borderRadius,
                        padding,
                        marginBottom,
                    },
                ]}
                testID={testID}
            >
                <Image
                    source={imageUri ? { uri: imageUri } : fallbackImage}
                    style={[
                        styles.logo,
                        {
                            height: logoSize,
                            backgroundColor: theme.text,
                        },
                    ]}
                    contentFit={contentFit}
                />

                <View style={styles.content}>
                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text,
                            },
                        ]}
                        adjustsFontSizeToFit
                        lineBreakStrategyIOS="push-out"
                        textBreakStrategy="highQuality"
                        numberOfLines={2}
                    >
                        {title}
                    </Text>

                    {chips.length > 0 && (
                        <View
                            style={[
                                styles.chipsRow,
                                { /* clés pour contenir sur 1 ligne sans débordement */
                                    minWidth: 0,
                                },
                            ]}
                        >
                            {chips.map((chip, idx) => (
                                <InfoPill
                                    key={`${chip.label}-${idx}`}
                                    label={chip.label}
                                    leftIconName={chip.icon}
                                    labelStyle={chip.labelStyle ?? { fontSize: 11, color: theme.textSecondary }}
                                    maxWidth={chip.maxWidth}
                                    style={{ flexShrink: 1, minWidth: 0 }}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </Pressable>
        </FadeIn>
    );
};

export default SearchCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        aspectRatio: 1,
        marginRight: 10,
        borderRadius: 12,
        flexShrink: 0,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "900",
    },
    chipsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        /** On force une seule ligne, mais on évite le débordement */
        flexWrap: "nowrap",
        overflow: "hidden",
    },
});