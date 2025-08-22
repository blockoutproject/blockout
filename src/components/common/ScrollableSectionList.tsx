import React from "react";
import { Platform, RefreshControlProps, ViewStyle, StyleProp } from "react-native";
import { Animated } from "react-native";
import { SectionListProps } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BottomSheetSectionList } from "@gorhom/bottom-sheet";

// On tape fort sur la compat TS : on accepte les props communes à SectionList
type AnyItem = any;
type AnySection = { data: AnyItem[];[k: string]: any };

type Props = SectionListProps<AnyItem, AnySection> & {
    /** true si rendu dans une Bottom Sheet gorhom */
    inSheet?: boolean;
    /** pour forwarder un style si besoin */
    style?: StyleProp<ViewStyle>;
    /** conserver un RefreshControl custom (ex: thème) */
    refreshControl?: React.ReactElement<RefreshControlProps> | undefined;
};

/**
 * Rend une SectionList "normale" hors sheet,
 * et une BottomSheetSectionList quand on est DANS la sheet (Android en particulier).
 */
export default function ScrollableSectionList({
    inSheet,
    ...rest
}: Props) {
    if (inSheet) {
        // 👉 Le composant gorhom intègre les gestes de la sheet + nested scroll Android
        return (
            <BottomSheetSectionList
                // aide la sheet à cibler la scrollable active (docs gorhom)
                focusHook={useFocusEffect}
                // on passe toutes les props de SectionList que tu utilisais
                {...rest}
            />
        );
    }

    // Hors sheet, on garde exactement ton Animated.SectionList
    return <Animated.SectionList {...rest} />;
}