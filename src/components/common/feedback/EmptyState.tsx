import React, { useState } from "react";
import StateCard, { StateAction } from "./StateCard";
import { DimensionValue } from "react-native";

/** Props for the empty data state. */
export type EmptyStateProps = {
    /** Main message. */
    title?: string;
    /** Optional subtitle. */
    subtitle?: string;
    /** Optional retry handler. */
    onRetry?: () => void;
    /** Optional top padding. */
    paddingTop?: DimensionValue;
    /** Label for the retry action. */
    retryLabel?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({
    title = "Rien ici pour l’instant.",
    subtitle,
    onRetry,
    paddingTop = "20%",
    retryLabel = "Rafraîchir",
}) => {
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        if (!onRetry || retrying) {
            return;
        }
        setRetrying(true);
        try {
            await Promise.resolve(onRetry());
        } finally {
            setRetrying(false);
        }
    };

    const action: StateAction | undefined = onRetry
        ? {
            label: retryLabel,
            onPress: handleRetry,
            icon: "refresh",
            loading: retrying,
            disabled: retrying,
            testID: "empty-retry",
        }
        : undefined;

    return (
        <StateCard
            title={title}
            subtitle={subtitle}
            fallbackIcon="playlist-remove"
            action={action}
            containerStyle={[
                {
                    paddingTop: paddingTop,
                },
            ]}
            testID="empty-state"
        />
    );
};

export default EmptyState;