import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { ProfileScreen } from "@/features/accounts/screens/profile-screen";
import { useAdvertisingChoices } from "@/features/advertising/advertising-provider";
import { AdvertisingChoicesEntry } from "@/features/privacy/components/advertising-choices-entry";
import { ProProfileEntry } from "@/features/pro/presentation";

/** Profile navigation requires ordinary admission; identity-only account reads remain independent. */
export default function ProfileRoute() {
  const { privacyOptionsRequired, privacyOptionsPending, showPrivacyOptions } =
    useAdvertisingChoices();
  return (
    <ProfileScreen
      admitted={useAccessAdmission().ordinary}
      proEntry={
        <ProProfileEntry>
          {privacyOptionsRequired && (
            <AdvertisingChoicesEntry
              pending={privacyOptionsPending}
              showPrivacyOptions={showPrivacyOptions}
            />
          )}
        </ProProfileEntry>
      }
    />
  );
}
