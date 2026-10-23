import { ProProfileFeedback } from "../features/pro/presentation";
import { useAccountAdmission } from "../features/accounts/components/account-admission";
import { ProfileScreen } from "../features/accounts/screens/profile-screen";

/** Profile navigation requires ordinary admission; identity-only account reads remain independent. */
export default function ProfileRoute() {
  return (
    <ProfileScreen
      admitted={useAccountAdmission()}
      proFeedback={<ProProfileFeedback />}
    />
  );
}
