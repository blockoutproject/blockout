import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useApplicationVersionsSettings } from "../api/use-application-versions-settings";
import { AdministrationSettingsPage } from "../components/administration-settings-page";
import { ApplicationVersionsLoading } from "../components/settings-loading";
import { ApplicationVersionsForm } from "../forms/application-versions-form";

export function ApplicationVersionsSettingsScreen() {
  const { permissions, account } = useAdministrationCapabilities();
  const canManage = permissions?.manageApplicationVersions === true;
  const editing = useApplicationVersionsSettings(canManage);

  return (
    <AdministrationSettingsPage
      account={account}
      canManage={canManage}
      query={editing.query}
      saving={editing.content.isPending}
      loadingContent={<ApplicationVersionsLoading />}
      renderForm={(settings, disabled) => (
        <ApplicationVersionsForm
          settings={settings}
          editing={editing}
          disabled={disabled}
        />
      )}
    />
  );
}
