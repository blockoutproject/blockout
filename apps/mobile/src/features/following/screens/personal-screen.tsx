import { useState, type ReactNode } from "react";
import { useRouter, useIsFocused } from "expo-router";
import { createLucideIcon, Flag } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  useAccountSession,
  useCurrentAccount,
  AccountSessionFeedback,
  AccountRecovery,
} from "@/features/accounts/current-account";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { BrandMark } from "@/shared/components/brand-mark";
import { IconButton } from "@/shared/components/icon-button";
import { supportHref } from "@/features/support";
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
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import {
  usePersonalSeasonScope,
  type PersonalSeasonScope,
} from "../components/personal-season-provider";
import { PersonalSeasonSelector } from "../components/personal-season-selector";

// The installed icon set has no Instagram glyph; the public factory keeps Lucide's stroke defaults.
const Instagram = createLucideIcon({
  name: "instagram",
  size: 24,
  node: [
    [
      "rect",
      {
        x: "2",
        y: "2",
        width: "20",
        height: "20",
        rx: "5",
        ry: "5",
        key: "frame",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "4", key: "lens" }],
    ["path", { d: "M17.5 6.5h.01", key: "flash" }],
  ],
});

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
    session.status === "signing-out";
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
  if (authenticated) {
    return (
      <PersonalSpace key={session.subject} scope={scope} profile={profile} />
    );
  }
  return (
    <Page header={<PersonalHeader />}>
      <PageScrollView>
        <FeedbackLayout>
          <AccountSessionFeedback
            loadingContent={<CalendarLoading label="Chargement de l'accueil" />}
          />
        </FeedbackLayout>
      </PageScrollView>
    </Page>
  );
}

/** Keeps Home branding and its adjacent actions together in ordinary chrome and the pager's collapsible header. */
function PersonalHeader() {
  const router = useRouter();
  const { colors } = useTheme();
  const handoff = useNativeHandoff("https://www.instagram.com/hugoecken");
  return (
    <View style={styles.header}>
      <View style={styles.brand} accessible accessibilityLabel="Blockout">
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
      <View style={styles.actions}>
        <IconButton
          label="Instagram"
          onPress={handoff.open}
          loading={handoff.pending}
        >
          <Instagram
            accessible={false}
            size={tokens.size.icon.lg}
            color={colors.icon}
          />
        </IconButton>
        <IconButton
          label="Signaler un problème"
          onPress={() => router.push(supportHref({ screen: "home" }))}
        >
          <Flag
            accessible={false}
            size={tokens.size.icon.lg}
            color={colors.icon}
          />
        </IconButton>
      </View>
    </View>
  );
}

/** Keeps the native pager before a business UUID exists; private reads retain their matching personal scope. */
function PersonalSpace({
  scope,
  profile,
}: Readonly<{
  scope: PersonalSeasonScope | null;
  profile: ReturnType<typeof useCurrentAccount>;
}>) {
  const season = scope?.season;
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const focused = useIsFocused();
  const profileFailed = hasReadError(profile);
  const ready =
    scope !== null &&
    scope.usable &&
    !!season?.options.data &&
    !scope.blocked &&
    !profileFailed &&
    !hasReadError(season.options);
  const blockingQuery =
    !scope?.usable || profileFailed ? profile : scope.season.options;
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
          options={scope?.blocked ? undefined : season?.options.data}
          seasonId={season?.seasonId}
          onPress={() => router.push("/season")}
          disabled={!ready}
        />
      </View>
    );
  }

  return (
    <Page fullBleed>
      <PagedTabs
        resetKey={season?.seasonId ?? "all-seasons"}
        selected={tab}
        onSelect={setTab}
        collapsibleHeader={<PersonalHeader />}
        fadeHeaderOnScroll
        renderTabBar={controls}
        tabs={tabs.map(({ id, label }) => ({
          id,
          label,
          content:
            !ready || !scope ? (
              <PageScrollView>
                <FeedbackLayout>
                  <AccountRecovery error={profile.error}>
                    <ReadFeedback
                      query={{
                        ...blockingQuery,
                        isEnabled:
                          (!scope || scope.admitted) && blockingQuery.isEnabled,
                      }}
                      loadingContent={
                        id === "following" ? (
                          <SportingEntityCardLoading label="Chargement des suivis" />
                        ) : (
                          <CalendarLoading
                            label={
                              scope ? undefined : "Chargement de l'accueil"
                            }
                          />
                        )
                      }
                    />
                  </AccountRecovery>
                </FeedbackLayout>
              </PageScrollView>
            ) : id === "upcoming" || id === "completed" ? (
              <PersonalCalendar
                key={season?.seasonId ?? "all-seasons"}
                owner={scope.owner}
                request={scope.request}
                seasonId={season?.seasonId}
                category={id}
                active={focused && tab === id}
                bypass={scope.bypass}
              />
            ) : (
              <FollowedLists
                key={season?.seasonId ?? "all-seasons"}
                owner={scope.owner}
                request={scope.request}
                seasonId={season?.seasonId}
                active={focused && tab === id}
                bypass={scope.bypass}
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
  brand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  actions: { flexDirection: "row", alignItems: "center" },
  controls: {
    paddingTop: tokens.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.screen,
  },
  tabs: { flex: 1, minWidth: 0 },
});
