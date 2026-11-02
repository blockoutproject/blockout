import { useAccessAdmission } from "../../../../features/access/queries/use-access-admission";
import { ProfileEditScreen } from "../../../../features/accounts/screens/profile-edit-screen";

/** Ordinary stack destination keeps profile drafts outside the account overview. */
export default function ProfileEditRoute() {
  return <ProfileEditScreen admitted={useAccessAdmission().ordinary} />;
}
