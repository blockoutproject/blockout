import { useLocalSearchParams } from "expo-router";
import { SupportChoice } from "../../../features/support/components/support-choice";

/** Native single-selection route; the enclosing support visit retains the editing form. */
export default function SupportChoiceRoute() {
  const { field } = useLocalSearchParams();
  return <SupportChoice field={field} />;
}
