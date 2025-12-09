import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StyleSheet as RNStyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPillGradient from "./chips/InfoPillGradient";
import { CORNERS } from "@/src/theme/globals";

export type HeroProps = {
    /** Titre principal. */
    title: string;
    /** Sous-titre (ex: ville, email). */
    subtitle?: string;
    /** Icône du sous-titre. */
    subtitleIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    /** URI de l’avatar. */
    avatarUri?: string | null;
    /** Fallback local pour l’avatar. */
    avatarFallback: any;
    /** URI du fond (par défaut on reprend l’avatar). */
    backgroundUri?: string | null;
    /** Fallback local pour le fond (par défaut on reprend l’avatarFallback). */
    backgroundFallback?: any;
    /** Bouton d’édition. */
    onEdit?: () => void;
    /** Test IDs. */
    testID?: string;
    editTestID?: string;
    /** Style/params visuels. */
    containerRadius?: number;
    avatarSize?: number;
    avatarRadius?: number;
    blurRadius?: number;
    titleLines?: number;
};

const DEFAULTS = {
    containerRadius: 18,
    avatarSize: 120,
    avatarRadius: 24,
    blurRadius: 60,
    titleLines: 2,
    EDGE: 0.95,
    MID: 0.0,
};

const Hero: React.FC<HeroProps> = ({
    title,
    subtitle,
    subtitleIcon,

    avatarUri,
    avatarFallback,

    backgroundUri,
    backgroundFallback,

    onEdit,
    testID = "entity-hero",
    editTestID = "entity-hero-edit",

    containerRadius = DEFAULTS.containerRadius,
    avatarSize = DEFAULTS.avatarSize,
    avatarRadius = DEFAULTS.avatarRadius,
    blurRadius = DEFAULTS.blurRadius,
    titleLines = DEFAULTS.titleLines,
}) => {
    const theme = useAppTheme();

    const bgSource =
        (backgroundUri ? { uri: backgroundUri } : undefined) ??
        (avatarUri ? { uri: avatarUri } : undefined) ??
        (backgroundFallback ?? avatarFallback);

    return (
        <View style={[styles.wrapper, { borderRadius: containerRadius }]} testID={testID}>
            {/* Fond flou */}
            <Image
                source={bgSource}
                style={RNStyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={blurRadius}
            />

            {/* Gradients croisés pour lisibilité */}
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
                    withAlpha(theme.backgroundSecondary, DEFAULTS.MID),
                    withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={RNStyleSheet.absoluteFill}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
                    withAlpha(theme.backgroundSecondary, DEFAULTS.MID),
                    withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={RNStyleSheet.absoluteFill}
            />

            {/* Bouton edit */}
            {onEdit ? (
                <TouchableOpacity
                    onPress={onEdit}
                    activeOpacity={0.85}
                    style={[
                        styles.fab,
                        {
                            backgroundColor: withAlpha(theme.surface, 0.85),
                            borderColor: withAlpha(theme.text, 0.12),
                        },
                    ]}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    testID={editTestID}
                >
                    <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.text} />
                </TouchableOpacity>
            ) : null}

            {/* Contenu */}
            <View style={styles.content}>
                <MaskedImage
                    uri={avatarUri || undefined}
                    size={avatarSize}
                    radius={avatarRadius}
                    shadow
                />

                <Text
                    style={[styles.title, { color: theme.text }]}
                    numberOfLines={titleLines}
                >
                    {title}
                </Text>

                {!!subtitle && (
                    <View style={styles.metaRow}>
                        <InfoPillGradient
                            label={subtitle}
                            leftIcon={subtitleIcon}
                            size="lg"
                            variant="filled"
                            gradient={undefined}
                            borderWidth={1}
                            backgroundColor={withAlpha(theme.surface, 0.9)}
                            borderColor={withAlpha(theme.text, 0.16)}
                            textColor={theme.text}
                        />
                    </View>
                )}
            </View>
        </View>
    );
};

export default Hero;

const styles = StyleSheet.create({
    wrapper: {
        overflow: "hidden",
        position: "relative",
    },
    content: {
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 24,
    },
    title: {
        textAlign: "center",
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.2,
        paddingHorizontal: 24,
    },
    metaRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
    },
    metaText: {
        fontSize: 14,
        fontWeight: "600",
    },
    fab: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 34,
        height: 34,
        borderRadius: CORNERS,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        zIndex: 5,
    },
});