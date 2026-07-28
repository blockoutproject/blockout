import React from "react";
import type { DimensionValue } from "react-native";

import StateCard from "@/src/shared/ui/feedback/state-card";

export type SearchStateProps = {
  title: string;
  subtitle?: string;
  paddingTop?: DimensionValue;
  testID?: string;
};

const SearchState = ({
  title,
  subtitle,
  paddingTop = "10%",
  testID = "search-state",
}: SearchStateProps) => (
  <StateCard
    variant="search"
    title={title}
    subtitle={subtitle}
    containerStyle={{ paddingTop }}
    testID={testID}
  />
);

export default SearchState;
