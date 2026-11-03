import { PageViewport } from "../../../shared/components/navigation-backdrop";
import { useState, type ReactNode } from "react";
import { useRouter, useIsFocused } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { BrandMark } from "../../../shared/components/brand-mark";
import { useTheme } from "../../../shared/theme/theme-provider";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { PersonalCalendar } from "../components/personal-calendar";
import { FollowedLists } from "../components/followed-lists";
import { Tabs } from "../../../shared/components/tabs";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { CalendarLoading } from "../../sporting/calendar";
import { SportingEntityCardLoading } from "../../sporting/entity-card";
import { Button } from "../../../shared/components/button";
import { tokens } from "../../../shared/theme/tokens";
import {
  usePersonalSeasonScope,
  type PersonalSeasonScope,
} from "../components/personal-season-provider";
import { PersonalSeasonSelector } from "../components/personal-season-selector";

/**
 * Composes account-owned personal calendars with the shared season and native F03 presentation.
 * F05/F12 retain profile/admission ownership; calendars and follow lists consume one personal season.
 */
export function PersonalScreen() {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const router = useRouter();
  const scope = usePersonalSeasonScope();
  return session.status === "guest" ? (
    <Page header={<PersonalHeader />}>
      <PageScrollView>
        <ScreenState style={styles.guest}>
          <Button
            label="Se connecter"
            onPress={() =>
              router.push({
                pathname: "/sign-in-invitation",
                params: { reason: "follow" },
              })
            }
          />
        </ScreenState>
      </PageScrollView>
    </Page>
  ) : scope ? (
    <PersonalSpace key={scope.owner.subject} scope={scope} />
  ) : (
    <Page header={<PersonalHeader />}>
      <PageScrollView>
        {profile.isPending ? (
          <PageContent>
            <CalendarLoading label="Chargement de l'accueil" />
          </PageContent>
        ) : (
          <ScreenState>
            <ReadFeedback
              query={profile}
              loadingContent={
                <CalendarLoading label="Chargement de l'accueil" />
              }
            />
          </ScreenState>
        )}
      </PageScrollView>
    </Page>
  );
}
/** Keeps fully named, one-line Home branding in ordinary chrome and the pager's collapsible header. */
function PersonalHeader() {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessible accessibilityLabel="Blockout">
      <BrandMark />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          tokens.typography.headingXl,
          { color: colors.text, flexShrink: 1 },
        ]}
      >
        Blockout
      </Text>
    </View>
  );
}
/** Keeps the choice and selected tab mounted while ordinary sporting routes cover Home. */
function PersonalSpace({ scope }: { scope: PersonalSeasonScope }) {
  const { owner, profile, season, request, usable, blocked, bypass } = scope;
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const focused = useIsFocused();
  const ready = usable && !!season.options.data && !blocked;
  const blockingQuery = !usable ? profile : season.options;
  const loadingContent =
    tab === "following" ? (
      <SportingEntityCardLoading label="Chargement des suivis" />
    ) : (
      <CalendarLoading />
    );
  /** Composes the native pager bar or non-paged admission choices beside the same season owner. */
  function controls(tabBar: ReactNode) {
    return (
      <View style={styles.controls}>
        <View style={styles.tabs}>{tabBar}</View>
        <PersonalSeasonSelector
          options={blocked ? undefined : season.options.data}
          seasonId={season.seasonId}
          onPress={() => router.push("/season")}
          disabled={!usable || blocked || !season.options.data}
        />
      </View>
    );
  }
  return (
    <Page fullBleed>
      {ready ? (
        <PagedTabs
          resetKey={season.seasonId ?? "all-seasons"}
          selected={tab}
          onSelect={setTab}
          collapsibleHeader={<PersonalHeader />}
          fadeHeaderOnScroll
          renderTabBar={controls}
          tabs={tabs.map(({ id, label }) => ({
            id,
            label,
            content:
              id === "upcoming" || id === "completed" ? (
                <PersonalCalendar
                  key={season.seasonId ?? "all-seasons"}
                  owner={owner}
                  request={request}
                  seasonId={season.seasonId}
                  category={id}
                  active={focused && tab === id}
                  bypass={bypass}
                />
              ) : (
                <FollowedLists
                  key={season.seasonId ?? "all-seasons"}
                  owner={owner}
                  request={request}
                  seasonId={season.seasonId}
                  active={focused && tab === id}
                  bypass={bypass}
                />
              ),
          }))}
        />
      ) : (
        <PageViewport
          header={
            <>
              <PersonalHeader />
              {controls(
                <Tabs
                  size="compact"
                  items={tabs}
                  selected={tab}
                  onSelect={setTab}
                />,
              )}
            </>
          }
        >
          <PageScrollView>
            {blockingQuery.isPending ? (
              <PageContent>{loadingContent}</PageContent>
            ) : (
              <ScreenState>
                <ReadFeedback
                  query={blockingQuery}
                  loadingContent={loadingContent}
                />
              </ScreenState>
            )}
          </PageScrollView>
        </PageViewport>
      )}
    </Page>
  );
}
const tabs = [
  { id: "upcoming", label: "À venir" },
  { id: "completed", label: "Terminés" },
  { id: "following", label: "Suivis" },
] as const;
const styles = StyleSheet.create({
  guest: { justifyContent: "center" },
  header: {
    minHeight: tokens.layout.header,
    marginHorizontal: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  controls: {
    paddingTop: tokens.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.screen,
  },
  tabs: { flex: 1, minWidth: 0 },
});
