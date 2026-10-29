import { PersonalSeasonScreen } from "../../../../../features/following/screens/personal-season-screen";

/** Choices consume the current Home scope; no account identity or callback is accepted from route parameters. */
export default function SeasonRoute() {
  return <PersonalSeasonScreen />;
}
