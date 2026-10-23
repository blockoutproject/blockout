import { useAccountAdmission } from "../features/accounts/components/account-admission";
import { SignInInvitationScreen } from "../features/accounts/screens/sign-in-invitation-screen";

/** Shared F05 invitation with F09's approved copy; no purchase or return intention is retained. */
export default function SignInInvitationRoute() {
  return (
    <SignInInvitationScreen
      admitted={useAccountAdmission()}
      message="Connectez-vous pour utiliser Blockout Pro"
    />
  );
}
