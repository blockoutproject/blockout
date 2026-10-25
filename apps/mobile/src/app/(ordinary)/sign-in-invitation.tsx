import { useLocalSearchParams } from "expo-router";
import { useAccountAdmission } from "../../features/accounts/components/account-admission";
import { SignInInvitationScreen } from "../../features/accounts/screens/sign-in-invitation-screen";

/** Shared contextual F05 invitation; the reason selects copy and carries no deferred command. */
export default function SignInInvitationRoute() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return (
    <SignInInvitationScreen
      admitted={useAccountAdmission()}
      message={
        reason === "follow"
          ? "Connectez-vous pour suivre vos équipes et vos poules"
          : "Connectez-vous pour utiliser Blockout Pro"
      }
    />
  );
}
