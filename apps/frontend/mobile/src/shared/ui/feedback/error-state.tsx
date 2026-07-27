import React from "react";
import StateCard from "./state-card";
import { DimensionValue } from "react-native";

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
  /** Stable id for the state boundary. */
  testID?: string;
  /** Stable id for the retry action. */
  retryTestID?: string;
};

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Oups ! Une erreur est survenue.",
  subtitle,
  onRetry,
  paddingTop = "20%",
  retryLabel = "Réessayer",
  testID = "error-state",
  retryTestID = "error-retry",
}) => {
  return (
    <StateCard
      variant="error"
      title={title}
      subtitle={subtitle}
      illustrationSource={require("@/assets/images/error.gif")}
      fallbackIcon="alert-circle-outline"
      action={{
        label: retryLabel,
        onPress: onRetry,
        icon: "refresh",
        loadingLabel: "Actualisation…",
        testID: retryTestID,
      }}
      containerStyle={[
        {
          paddingTop: paddingTop,
        },
      ]}
      testID={testID}
    />
  );
};

export default ErrorState;
