import { useLocalSearchParams } from "expo-router";
import { ReportContributionScreen } from "../../../../features/contributions/screens/report-contribution-screen";

/** Ordinary stack route with the exact public F03 version; authentication carries no deferred report. */
export default function ReportContributionRoute() {
  const { matchId, contributionId, contributionUrl } = useLocalSearchParams<{
    matchId: string;
    contributionId: string;
    contributionUrl?: string;
  }>();
  return (
    <ReportContributionScreen
      matchId={matchId}
      contributionId={contributionId}
      contributionUrl={contributionUrl}
    />
  );
}
