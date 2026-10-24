import { useRouter } from "expo-router";
import {
  useAccessAdmission,
  useOperationalAdmission,
} from "../../../features/access/queries/use-access-admission";
import { AdministrationScreen } from "../../../features/access/screens/administration-screen";

/** Keeps isolated mounts closed; production admission uses current operational grants and native minimums. */
export default function AdministrationRoute() {
  return useOperationalAdmission() ? (
    <AdmittedAdministration />
  ) : (
    <AdministrationScreen admitted={false} />
  );
}

/** Offers the separate personal bypass command without granting other technical capabilities. */
function AdmittedAdministration() {
  const access = useAccessAdmission();
  const router = useRouter();
  return (
    <AdministrationScreen
      admitted
      onBypass={
        access.canBypass
          ? () => {
              if (access.bypassMaintenance()) router.replace("/");
            }
          : undefined
      }
    />
  );
}
