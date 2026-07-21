import React, {useState} from "react";
import StateCard from "./StateCard";
import {DimensionValue} from "react-native";

/** Props for the error state. */
export type ErrorStateProps = {
  /** Main message. */
  title?: string;
  /** Optional subtitle. */
  subtitle?: string;
  /** Retry handler. */
  onRetry: () => void;
  /** Optional top padding. */
  paddingTop?: DimensionValue;
  /** Label for the retry action. */
  retryLabel?: string;
};

const ErrorState: React.FC<ErrorStateProps> = ({
                                                 title = "Oups ! Une erreur est survenue.",
                                                 subtitle,
                                                 onRetry,
                                                 paddingTop = "20%",
                                                 retryLabel = "Réessayer",
                                               }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying) {
      return;
    }
    setRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <StateCard
      title={title}
      subtitle={subtitle}
      illustrationSource={require("@/assets/images/error.gif")}
      fallbackIcon="alert-circle-outline"
      action={{
        label: retryLabel,
        onPress: handleRetry,
        icon: "refresh",
        loading: retrying,
        disabled: retrying,
        testID: "error-retry",
      }}
      containerStyle={[
        {
          paddingTop: paddingTop,
        },
      ]}
      testID="error-state"
    />
  );
};

export default ErrorState;
