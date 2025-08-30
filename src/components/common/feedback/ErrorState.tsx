import React from "react";
import StateCard from "./StateCard";

export type ErrorStateProps = {
    message?: string;
    subtitle?: string;
    onRetry: () => void;
    home?: boolean;
};

const ErrorState: React.FC<ErrorStateProps> = ({
    message = "Oups ! Une erreur est survenue.",
    subtitle,
    onRetry,
    home = false,
}) => {
    return (
        <StateCard
            title={message}
            subtitle={subtitle}
            illustrationSource={require("@/assets/images/error-dino.png")}
            fallbackIcon="alert-circle-outline"
            action={{
                label: "Réessayer",
                onPress: onRetry,
                icon: "refresh",
            }}
            containerStyle={home ? { paddingTop: "20%" } : undefined}
        />
    );
};

export default ErrorState;