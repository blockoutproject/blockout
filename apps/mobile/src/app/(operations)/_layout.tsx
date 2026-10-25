import { Stack } from "expo-router";
import { useAccessAdmission } from "../../features/access/queries/use-access-admission";

/** Protects each implemented operational destination with its own current action grant. */
export default function OperationsLayout() {
  const { permissions } = useAccessAdmission();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="administration/index" />
      <Stack.Protected guard={permissions?.manageMaintenance === true}>
        <Stack.Screen name="administration/maintenance" />
      </Stack.Protected>
      <Stack.Protected guard={permissions?.manageApplicationVersions === true}>
        <Stack.Screen name="administration/application-versions" />
      </Stack.Protected>
      <Stack.Protected guard={permissions?.manageCollection === true}>
        <Stack.Screen name="collection" />
      </Stack.Protected>
      <Stack.Protected guard={permissions?.manageSportingPresentation === true}>
        <Stack.Screen name="administration/presentation/[kind]/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
