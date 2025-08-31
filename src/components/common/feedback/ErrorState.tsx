import React, { useState } from "react";
import StateCard from "./StateCard";
import { DimensionValue } from "react-native";

export type ErrorStateProps = {
    message?: string;
    subtitle?: string;
    onRetry: () => void;
    paddingTop?: DimensionValue;
    retryLabel?: string;
};

const ErrorState: React.FC<ErrorStateProps> = ({
    message = "Oups ! Une erreur est survenue.",
    subtitle,
    onRetry,
    paddingTop = "20%",
    retryLabel = "Réessayer",
}) => {
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);
        try {
            await Promise.resolve(onRetry()); // support sync/async
        } finally {
            setRetrying(false);
        }
    };

    return (
        <StateCard
            title={message}
            subtitle={subtitle}
            illustrationSource={require("@/assets/images/error.jpg")}
            fallbackIcon="alert-circle-outline"
            action={{
                label: retryLabel,
                onPress: handleRetry,
                icon: "refresh",
                loading: retrying,
                disabled: retrying,
                testID: "error-retry",
            }}
            containerStyle={{ paddingTop }}
        />
    );
};

export default ErrorState;