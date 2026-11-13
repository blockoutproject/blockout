import { StyleSheet } from "react-native";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { ProviderPreparationLoading } from "../components/collection-loading";
import { useSeasonPreparation } from "../api/use-source-preparation";
import { ProviderPreparationForm } from "../forms/provider-preparation-form";

/** Selects the season/provider whose current reads admit the retained preparation form. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
}

/** Keeps source selection and manual input with their native form while required reads recover. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
}: Readonly<ProviderSourcesScreenProps>) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const visitKey = `${authority.session.subject}:${seasonId}:${provider}`;
  const requiredRead =
    [authority.account, season, sources].find(hasReadError) ??
    (!season.data ? season : sources);
  const blocked =
    !authority.enabled ||
    hasReadError(authority.account) ||
    !season.data ||
    !sources.data ||
    hasReadError(season) ||
    hasReadError(sources);
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(requiredRead) && (season.isLoading || sources.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title={provider === "lnv" ? "LNV" : "FFVB"} />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={sources.isFetching || season.isFetching}
            enabled={!blocked && !editing.create.isPending}
            onRefresh={() =>
              Promise.all([
                season.refetch({ cancelRefetch: false }),
                sources.refetch({ cancelRefetch: false }),
              ])
            }
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<ProviderPreparationLoading />}
              />
            ) : (
              <ReadFeedback
                query={requiredRead}
                loadingContent={<ProviderPreparationLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          <ProviderPreparationForm
            key={visitKey}
            season={sources.data ? season.data : null}
            provider={provider}
            editing={editing}
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
