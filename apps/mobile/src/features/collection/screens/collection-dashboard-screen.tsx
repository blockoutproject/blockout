import { useRouter } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { Text } from "react-native";

import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";

import { EmptyState } from "@/shared/components/state-card";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { useCollectionSeasons } from "../api/use-collection-season";
import { CollectionControlRead } from "../components/collection-control-read";
import { CollectionLoading } from "../components/collection-loading";
import { CollectionDestinationLink } from "../components/collection-destination-link";
import { seasonStatus } from "../components/collection-season-summary";
import {
  collectionClubFamilyLabels,
  type ClubCollectionFamily,
} from "../model/collection-club-family";
import { collectionClubBilanHref } from "../model/collection-hrefs";
import {
  CollectionFollowUp,
  CollectionFollowUpLoading,
} from "./collection-follow-up-screen";

const clubDestinations = [
  { family: "club-sheets", icon: Users },
  { family: "geocoding", icon: MapPin },
] as const;

/** The landing menu requires its bounded seasons read; control commands own separate destinations. */
export function CollectionDashboardScreen() {
  const { authority, query } = useCollectionSeasons();
  const { colors } = useTheme();
  const router = useRouter();
  const failed = hasReadError(query);

  const FeedbackLayout = isAccessLoading(authority) ? PageContent : ScreenState;
  return (
    <Page header={<PageHeader title="Collectes" />}>
      <PageScrollView
        refreshControl={
          authority.enabled && !failed ? (
            <DataRefreshControl
              onRefresh={() => query.refetch({ cancelRefetch: false })}
              fetching={query.isFetching}
            />
          ) : undefined
        }
      >
        {!authority.enabled ? (
          <FeedbackLayout>
            <AccessFeedback
              {...authority}
              loadingContent={<CollectionLoading />}
            />
          </FeedbackLayout>
        ) : failed ? (
          <ScreenState>
            <ReadFeedback
              query={query}
              loadingContent={<CollectionLoading />}
            />
          </ScreenState>
        ) : (
          <PageContent>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Compétitions
            </Text>
            {query.data?.items.map((season) => (
              <CollectionDestinationLink
                key={season.id}
                label={season.label}
                detail={seasonStatus(season).label}
                icon={CalendarDays}
                onPress={() =>
                  router.push({
                    pathname: "/collection/[seasonId]",
                    params: { seasonId: season.id },
                  })
                }
              />
            ))}
            {query.data?.items.length === 0 && (
              <EmptyState title="Aucune saison découverte">
                <ReloadButton query={query} />
              </EmptyState>
            )}
            <ReadFeedback
              query={query}
              loadingContent={<CollectionLoading />}
            />
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Clubs · indépendants des saisons
            </Text>
            {clubDestinations.map(({ family, icon }) => (
              <CollectionDestinationLink
                key={family}
                label={collectionClubFamilyLabels[family]}
                icon={icon}
                onPress={() =>
                  router.push({
                    pathname: "/collection/clubs/[family]",
                    params: { family },
                  })
                }
              />
            ))}
          </PageContent>
        )}
      </PageScrollView>
    </Page>
  );
}

/** The two club families share Suivi without a season prerequisite. */
export function CollectionControlScreen({
  family,
}: Readonly<{ family: ClubCollectionFamily }>) {
  const router = useRouter();
  return (
    <Page
      header={
        <PageHeader
          title="Collecte"
          subtitle={collectionClubFamilyLabels[family]}
        />
      }
    >
      <CollectionControlRead
        family={family}
        view="suivi"
        loadingContent={<CollectionFollowUpLoading />}
      >
        {(control, controls) => (
          <CollectionFollowUp
            key={control.id}
            control={control}
            controls={controls}
            onOpenBilan={() => router.push(collectionClubBilanHref(family))}
          />
        )}
      </CollectionControlRead>
    </Page>
  );
}
