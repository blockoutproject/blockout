import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useAccountAdmission } from "../../../features/accounts/components/account-admission";
import { MaintenanceSettingsScreen } from "../../../features/access/screens/maintenance-settings-screen";
import { RequestError } from "../../../shared/components/request-feedback";

/** Preserves closed production admission until F12 composes the operational route group. */
export default function MaintenanceRoute() {
  return useAccountAdmission() ? (
    <AdmittedMaintenance />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
/** Uses the installed router's supported native removal guard for explicit draft discard. */
function AdmittedMaintenance() {
  const [dirty, setDirty] = useState(false);
  const navigation = useNavigation();
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert(
      "Abandonner les modifications ?",
      "Votre brouillon n’a pas été enregistré.",
      [
        { text: "Continuer la saisie", style: "cancel" },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });
  return <MaintenanceSettingsScreen onDirtyChange={setDirty} />;
}
