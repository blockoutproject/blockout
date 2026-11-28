import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { AdministrationSettingsPage } from "../components/administration-settings-page";
import { MaintenanceLoading } from "../components/settings-loading";
import { MaintenanceForm } from "../forms/maintenance-form";

export function MaintenanceSettingsScreen() {
  const { permissions, account } = useAdministrationCapabilities();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);

  return (
    <AdministrationSettingsPage
      account={account}
      canManage={canManage}
      query={editing.query}
      saving={editing.content.isPending || editing.activation.isPending}
      loadingContent={<MaintenanceLoading />}
      renderForm={(settings, disabled) => (
        <MaintenanceForm
          settings={settings}
          editing={editing}
          disabled={disabled}
        />
      )}
    />
  );
}
