import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Button } from "../../../shared/components/button";
import { useAccountSession } from "../../accounts/current-account";

/** Public match entry; private eligibility is read on opening and never inferred from Pro or a cached link. */
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
  const session = useAccountSession();
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
