import React from "react";
import StateCard from "./StateCard";

export type ErrorStateProps = {
    message?: string;
    onRetry: () => void;
};

const ErrorState: React.FC<ErrorStateProps> = ({
    message = "Oups ! Une erreur est survenue.",
    onRetry,
}) => {
    return (
        <StateCard
            title={message}
            illustrationSource={require("@/assets/images/error-dino.png")}
            fallbackIcon="alert-circle-outline"
            action={{
                label: "Réessayer",
                onPress: onRetry,
                icon: "refresh",
                testID: "error-state-retry",
            }}
            testID="error-state"
        />
    );
};

export default ErrorState;