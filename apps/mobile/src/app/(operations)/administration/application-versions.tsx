import { useState } from "react";
import { Alert } from "react-native";
import { usePreventRemove } from "expo-router";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { ApplicationVersionsSettingsScreen } from "../../../features/access/screens/application-versions-settings-screen";
import { RequestError } from "../../../shared/components/request-feedback";

/** Requires current operational admission before mounting the authorized versions editor. */
export default function ApplicationVersionsRoute() {
  return useOperationalAdmission() ? (
    <AdmittedApplicationVersions />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
/** Uses the installed router's supported native removal guard for explicit draft discard. */
function AdmittedApplicationVersions() {
  const [dirty, setDirty] = useState(false);
  usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert(
      "Abandonner les modifications ?",
      "Votre brouillon n’a pas été enregistré.",
      [
        { text: "Continuer la saisie", style: "cancel" },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: () => {
            setDirty(false);
            repeat();
          },
        },
      ],
    );
  });
  return <ApplicationVersionsSettingsScreen onDirtyChange={setDirty} />;
}
