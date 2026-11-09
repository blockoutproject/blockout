import { useLocalSearchParams } from "expo-router";
import { useAccessAdmission } from "../../features/access/queries/use-access-admission";
import { SignInInvitationScreen } from "../../features/accounts/screens/sign-in-invitation-screen";

/** Shared contextual F05 invitation; the reason selects copy and carries no deferred command. */
export default function SignInInvitationRoute() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return (
    <SignInInvitationScreen
      admitted={useAccessAdmission().ordinary}
      message={invitationMessage(reason)}
    />
  );
}

/** Chooses contextual invitation copy without retaining a deferred command. */
function invitationMessage(reason: string | undefined): string {
  switch (reason) {
    case "stream-report":
      return "Connectez-vous pour signaler ce Stream link";
    case "contribution":
      return "Connectez-vous pour proposer un Stream link";
    case "follow":
      return "Connectez-vous pour suivre vos équipes et vos poules";
    default:
      return "Connectez-vous pour utiliser Blockout Pro";
  }
}
