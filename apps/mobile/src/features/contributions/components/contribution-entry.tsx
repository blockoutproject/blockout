import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Button } from "../../../shared/components/button";
import { useOwnContributionsRead } from "../api/own-contributions";

/** Public match entry offered to guests or currently eligible accounts, independently of Pro. */
export interface ContributionEntryProps {
  matchId: string;
  contextColor?: string;
}
/** Opens the ordinary form or a contextual F05 invitation, carrying no address or deferred command. */
export function ContributionEntry({
  matchId,
  contextColor,
}: ContributionEntryProps) {
  const router = useRouter();
  const { session, query, usable } = useOwnContributionsRead(matchId);
  if (
    session.status !== "guest" &&
    (!usable || query.isError || !query.data?.pages[0]?.eligibility.canSubmit)
  )
    return null;
  return (
    <Button
      label="Stream link"
      accessibilityHint="Proposer une adresse de diffusion pour ce match"
      leadingIcon={Plus}
      variant="inverse"
      size="compact"
      contextColor={contextColor}
      onPress={() =>
        session.status === "guest"
          ? router.push({
              pathname: "/sign-in-invitation",
              params: { reason: "contribution" },
            })
          : router.push({
              pathname: "/matches/[matchId]/contribution",
              params: { matchId },
            })
      }
    />
  );
}
