import { useLocalSearchParams } from "expo-router";
import { ClubScreen } from "../../../features/sporting/screens/club-screen";

/** UUID route inside the existing ordinary admission group. */
export default function ClubRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  return <ClubScreen clubId={clubId} />;
}
