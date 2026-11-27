import { accountReturnPath } from "@/features/accounts/navigation/account-return-path";
import { useLocalSearchParams } from "expo-router";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SignInInvitationScreen } from "@/features/accounts/screens/sign-in-invitation-screen";

/** Shared contextual F05 invitation; the reason selects copy and carries no deferred command. */
export default function SignInInvitationRoute() {
  const { reason, returnTo } = useLocalSearchParams<{
    reason?: string;
    returnTo?: string;
  }>();
  return (
    <SignInInvitationScreen
      admitted={useAccessAdmission().ordinary}
      message={invitationMessage(reason)}
      returnTo={accountReturnPath(returnTo)}
    />
  );
}

/** Chooses contextual invitation copy without retaining a deferred command. */
function invitationMessage(reason: string | undefined): string {
  switch (reason) {
    case "stream-report":
      return "Connectez-vous pour signaler ce lien de diffusion";
    case "contribution":
      return "Connectez-vous pour proposer un lien de diffusion";
    case "follow":
      return "Connectez-vous pour suivre vos équipes et vos poules";
    case undefined:
    default:
      return "Connectez-vous pour utiliser Blockout Pro";
  }
}
