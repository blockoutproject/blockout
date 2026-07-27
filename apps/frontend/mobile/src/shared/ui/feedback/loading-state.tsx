import React from "react";
import type { DimensionValue } from "react-native";

import StateCard from "@/src/shared/ui/feedback/state-card";

export type LoadingStateProps = {
  title?: string;
  subtitle?: string;
  paddingTop?: DimensionValue;
  testID?: string;
};

const LoadingState = ({
  title = "Chargement…",
  subtitle,
  paddingTop = "20%",
  testID = "loading-state",
}: LoadingStateProps) => (
  <StateCard
    variant="loading"
    title={title}
    subtitle={subtitle}
    containerStyle={{ paddingTop }}
    testID={testID}
  />
);

export default LoadingState;
