import React from "react";
import StateCard, { StateAction } from "./state-card";
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
  /** Stable id for the state boundary. */
  testID?: string;
  /** Stable id for the retry action. */
  retryTestID?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Rien ici pour l’instant.",
  subtitle,
  onRetry,
  paddingTop = "20%",
  retryLabel = "Rafraîchir",
  testID = "empty-state",
  retryTestID = "empty-retry",
}) => {
  const action: StateAction | undefined = onRetry
    ? {
        label: retryLabel,
        onPress: onRetry,
        icon: "refresh",
        loadingLabel: "Actualisation…",
        testID: retryTestID,
      }
    : undefined;

  return (
    <StateCard
      variant="empty"
      title={title}
      subtitle={subtitle}
      illustrationSource={require("@/assets/images/empty.gif")}
      action={action}
      containerStyle={[
        {
          paddingTop: paddingTop,
        },
      ]}
      testID={testID}
    />
  );
};

export default EmptyState;
