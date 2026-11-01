import { useLocalSearchParams } from "expo-router";
import { useAccessAdmission } from "../../features/access/queries/use-access-admission";
import { SignInInvitationScreen } from "../../features/accounts/screens/sign-in-invitation-screen";

/** Shared contextual F05 invitation; the reason selects copy and carries no deferred command. */
export default function SignInInvitationRoute() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return (
    <SignInInvitationScreen
      admitted={useAccessAdmission().ordinary}
      message={
        reason === "stream-report"
          ? "Connectez-vous pour signaler ce Stream link"
          : reason === "contribution"
            ? "Connectez-vous pour proposer un Stream link"
            : reason === "follow"
              ? "Connectez-vous pour suivre vos équipes et vos poules"
              : "Connectez-vous pour utiliser Blockout Pro"
      }
    />
  );
}
