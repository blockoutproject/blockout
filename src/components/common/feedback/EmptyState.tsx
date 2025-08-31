import React from "react";
import StateCard from "./StateCard";
import { DimensionValue } from "react-native";


export type EmptyStateProps = {
    title: string;
    subtitle: string;
    home?: boolean;
    paddingTop?: DimensionValue;
};

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    subtitle,
    paddingTop = "20%"
}) => {
    return (
        <StateCard
            title={title}
            subtitle={subtitle}
            fallbackIcon="playlist-remove"
            containerStyle={{ paddingTop: paddingTop }}
        />
    );
};

export default EmptyState;