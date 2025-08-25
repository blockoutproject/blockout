import React from "react";
import StateCard from "./StateCard";
import { useAppTheme } from "@/src/context/ThemeProvider";

/**
 * Props compatibles avec l'ancienne API (EmptyPrompt),
 * en plus d’un rendu modernisé et cohérent avec ErrorState.
 */
export type EmptyStateProps = {
    title: string;
    subtitle: string;
    /**
     * Si utilisé sur l’écran d’accueil, conserve un léger offset vertical.
     * (Comportement rétro-compatible)
     */
    home?: boolean;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, home = false }) => {
    const theme = useAppTheme();

    return (
        <StateCard
            title={title}
            subtitle={subtitle}
            // Icône par défaut pour un état vide
            fallbackIcon="playlist-remove"
            // Conserve l'espacement "home" de l'ancienne version si demandé
            containerStyle={home ? { paddingTop: "30%", backgroundColor: theme.background } : undefined}
            testID="empty-state"
        />
    );
};

export default EmptyState;