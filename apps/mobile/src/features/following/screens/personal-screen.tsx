import { useState } from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter, useIsFocused } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ApiError } from "../../../shared/api/api-fetch";
import { Page, PageScrollView } from "../../../shared/components/page";
import { BrandMark } from "../../../shared/components/brand-mark";
import { useTheme } from "../../../shared/theme/theme-provider";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { TabScrollView } from "react-native-collapsible-tab";
import { PersonalCalendar } from "../components/personal-calendar";
import { Tabs } from "../../../shared/components/tabs";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { Button } from "../../../shared/components/button";
import { tokens } from "../../../shared/theme/tokens";
import {
  captureFollowingOwner,
  type FollowingOwner,
} from "../api/following-keys";
import { usePersonalSeason } from "../hooks/use-personal-season";
import { PersonalSeasonSelector } from "../components/personal-season-selector";

/**
 * Composes account-owned personal calendars with the shared season and native F03 presentation.
 * F05/F12 retain profile and admission ownership; follow lists keep their independent scope.
 */
export function PersonalScreen() {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const router = useRouter();
  const owner = captureFollowingOwner(session);
  return session.status === "guest" ? (
    <Page>
      <PersonalHeader />
      <PageScrollView>
        <ScreenState>
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
  ) : owner ? (
    <PersonalSpace
      key={owner.generation}
      owner={owner}
      usable={
        admission.admitted &&
        profile.isSuccess &&
        profile.data.accountId === owner.accountId
      }
      profile={profile}
    />
  ) : (
    <Page>
      <PersonalHeader />
      <PageScrollView>
        <ScreenState>
          <ReadFeedback query={profile} />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}

/** The branded heading retracts above the sticky personal controls through the native pager. */
function PersonalHeader() {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessible accessibilityLabel="Blockout">
      <BrandMark />
      <Text
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
function PersonalSpace({
  owner,
  usable,
  profile,
}: {
  owner: FollowingOwner;
  usable: boolean;
  profile: ReturnType<typeof useCurrentAccount>;
}) {
  const { getCredentials } = useAuth0();
  const admission = useOrdinaryRequest();
  const [tab, setTab] = useState("upcoming");
  const focused = useIsFocused();

  /** Prepares only a current original-owner request after native credentials and current F12 admission. */
  async function request(signal?: AbortSignal) {
    if (!owner.isCurrent(owner.generation)) throw new ApiError("cancelled");
    const credentials = await getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      signal,
      session: owner,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  const season = usePersonalSeason(
    owner,
    request,
    usable,
    Boolean(admission.bypass),
  );
  const [optionsRefused, setOptionsRefused] = useState(false);
  const refused =
    isAccessDenied(season.options.error) ||
    (season.options.error instanceof ApiError &&
      season.options.error.status === 404);
  // A transient retry failure cannot release a known restriction on retained private options.
  if (refused && !optionsRefused) setOptionsRefused(true);
  else if (optionsRefused && season.options.isSuccess) setOptionsRefused(false);
  const blocked = isAccessDenied(profile.error) || refused || optionsRefused;

  const ready = usable && !!season.options.data && !blocked;
  /** The owning selector refreshes only its current options, including inside the native modal. */
  function controls(onSelect: (id: string) => void) {
    return (
      <View style={styles.controls}>
        <View style={styles.tabs}>
          <Tabs
            size="compact"
            items={tabs}
            selected={tab}
            onSelect={onSelect}
          />
        </View>
        <PersonalSeasonSelector
          options={blocked ? undefined : season.options.data}
          seasonId={season.seasonId}
          onSelect={season.selectSeason}
          onReset={season.resetSeason}
          scopeKey={owner.generation}
          onOpen={async () => {
            await season.options.refetch({
              cancelRefetch: false,
              throwOnError: true,
            });
          }}
          disabled={!usable || blocked || !season.options.data}
        />
      </View>
    );
  }
  return (
    <Page edges={ready ? ["left", "right", "bottom"] : undefined}>
      {ready ? (
        <PagedTabs
          selected={tab}
          onSelect={setTab}
          collapsibleHeader={<PersonalHeader />}
          renderTabBar={({ onTabPress }) => controls(onTabPress)}
          tabs={tabs.map(({ id, label }) => ({
            id,
            label,
            content:
              id === "upcoming" || id === "completed" ? (
                <PersonalCalendar
                  owner={owner}
                  request={request}
                  read={season.read}
                  seasonId={season.seasonId}
                  category={id}
                  active={focused && tab === id}
                  bypass={Boolean(admission.bypass)}
                />
              ) : (
                <TabScrollView alwaysBounceVertical>
                  <View />
                </TabScrollView>
              ),
          }))}
        />
      ) : (
        <>
          <PersonalHeader />
          {controls(setTab)}
          <PageScrollView>
            <ScreenState>
              <ReadFeedback query={!usable ? profile : season.options} />
            </ScreenState>
          </PageScrollView>
        </>
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
  header: {
    minHeight: tokens.layout.header,
    marginHorizontal: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  tabs: { flex: 1, minWidth: 0 },
});
