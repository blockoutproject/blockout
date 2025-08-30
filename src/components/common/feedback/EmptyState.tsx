import React from "react";
import StateCard from "./StateCard";


export type EmptyStateProps = {
    title: string;
    subtitle: string;
    home?: boolean;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, home = false }) => {
    return (
        <StateCard
            title={title}
            subtitle={subtitle}
            fallbackIcon="playlist-remove"
            containerStyle={home ? { paddingTop: "20%" } : undefined}
        />
    );
};

export default EmptyState;