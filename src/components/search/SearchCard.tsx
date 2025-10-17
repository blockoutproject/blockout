import React from "react";
import { Text, View, Pressable, StyleSheet, DimensionValue } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import InfoPill from "@/src/components/common/chips/InfoPill";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FadeIn from "../common/animations/FadeIn";
import MaskedImage from "../common/images/MaskedImage";

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
    /** Liste des chips (une seule ligne, troncature si besoin). */
    chips?: SearchCardChip[];
    /** Handler press. */
    onPress: () => void;
    /** Pour tester (e2e). */
    testID?: string;
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
    chips = [],
    onPress,
    testID,
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
                <MaskedImage
                    uri={imageUri}
                    size={logoSize}
                    radius={12}
                    style={styles.logo}
                    shadow
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
                            ]}
                        >
                            {chips.map((chip, idx) => (
                                <InfoPill
                                    key={`${chip.label}-${idx}`}
                                    label={chip.label}
                                    leftIconName={chip.icon}
                                    labelStyle={chip.labelStyle ?? { fontSize: 11, color: theme.textSecondary }}
                                    maxWidth={chip.maxWidth}
                                    style={{ flexShrink: 1 }}
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
        marginRight: 10,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
    },
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 6,
    },
});