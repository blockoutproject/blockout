import { useState, type ReactNode } from "react";
import { useRouter, useIsFocused } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  useAccountSession,
  useCurrentAccount,
  AccountSessionFeedback,
} from "@/features/accounts/current-account";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { BrandMark } from "@/shared/components/brand-mark";
import { useTheme } from "@/shared/theme/theme-provider";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { PersonalCalendar } from "../components/personal-calendar";
import { FollowedLists } from "../components/followed-lists";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { CalendarLoading } from "@/features/sporting/calendar";
import { SportingEntityCardLoading } from "@/features/sporting/entity-card";
import { Button } from "@/shared/components/button";
import { tokens } from "@/shared/theme/tokens";
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
  const authenticated = session.status === "authenticated";
  const pending =
    session.status === "restoring" ||
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    (authenticated && profile.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (session.status === "guest") {
    return (
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
    );
  }
  if (authenticated && scope) {
    return <PersonalSpace key={scope.owner.subject} scope={scope} />;
  }
  return (
    <Page header={<PersonalHeader />}>
      <PageScrollView>
        <FeedbackLayout>
          {authenticated ? (
            <ReadFeedback
              query={profile}
              loadingContent={
                <CalendarLoading label="Chargement de l'accueil" />
              }
            />
          ) : (
            <AccountSessionFeedback
              loadingContent={
                <CalendarLoading label="Chargement de l'accueil" />
              }
            />
          )}
        </FeedbackLayout>
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

/** Keeps the common read owner and native pager mounted across failures and ordinary sporting visits. */
function PersonalSpace({ scope }: Readonly<{ scope: PersonalSeasonScope }>) {
  const { owner, profile, season, request, admitted, usable, blocked, bypass } =
    scope;
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const focused = useIsFocused();
  const profileFailed = hasReadError(profile);
  const ready =
    usable &&
    !!season.options.data &&
    !blocked &&
    !profileFailed &&
    !hasReadError(season.options);
  const blockingQuery = !usable || profileFailed ? profile : season.options;
  const FeedbackLayout =
    blockingQuery.isPending && !hasReadError(blockingQuery)
      ? PageContent
      : ScreenState;

  /** Keeps shared tab navigation and the retained season beside their existing readiness guard. */
  function controls(tabBar: ReactNode) {
    return (
      <View style={styles.controls}>
        <View style={styles.tabs}>{tabBar}</View>
        <PersonalSeasonSelector
          options={blocked ? undefined : season.options.data}
          seasonId={season.seasonId}
          onPress={() => router.push("/season")}
          disabled={!ready}
        />
      </View>
    );
  }

  return (
    <Page fullBleed>
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
          content: !ready ? (
            <PageScrollView>
              <FeedbackLayout>
                <ReadFeedback
                  query={{
                    ...blockingQuery,
                    isEnabled: admitted && blockingQuery.isEnabled,
                  }}
                  loadingContent={
                    id === "following" ? (
                      <SportingEntityCardLoading label="Chargement des suivis" />
                    ) : (
                      <CalendarLoading />
                    )
                  }
                />
              </FeedbackLayout>
            </PageScrollView>
          ) : id === "upcoming" || id === "completed" ? (
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
