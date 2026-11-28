import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { Stack } from "expo-router";
import { useSheetScreenOptions } from "@/shared/components/sheet";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { canReadDivisions } from "@/features/access/division-catalog-access";

/** Protects each implemented operational destination with its own current action grant. */
export default function OperationsLayout() {
  const screenOptions = useStackScreenOptions();
  const { permissions } = useAccessAdmission();
  const sheetOptions = useSheetScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
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
      <Stack.Protected
        guard={permissions?.manageSportingClassification === true}
      >
        <Stack.Screen name="administration/mapping/index" />
        <Stack.Screen name="administration/mapping/[packId]" />
        <Stack.Screen
          name="administration/mapping/filters"
          options={sheetOptions}
        />
        <Stack.Screen
          name="administration/classification/[kind]/[id]"
          options={sheetOptions}
        />
      </Stack.Protected>
      <Stack.Protected guard={canReadDivisions(permissions)}>
        <Stack.Screen name="administration/divisions/index" />
      </Stack.Protected>
      <Stack.Protected
        guard={
          permissions?.manageSportingPresentation === true ||
          permissions?.manageDivisionLifecycle === true
        }
      >
        <Stack.Screen name="administration/divisions/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={permissions?.manageDivisionLifecycle === true}>
        <Stack.Screen name="administration/divisions/new" />
      </Stack.Protected>
      <Stack.Protected guard={permissions?.manageSportingPresentation === true}>
        <Stack.Screen name="administration/presentation/[kind]/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
