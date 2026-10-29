import { useState } from "react";
import { useRouter, useIsFocused } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
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
  usePersonalSeasonScope,
  type PersonalSeasonScope,
} from "../components/personal-season-provider";
import { PersonalSeasonSelector } from "../components/personal-season-selector";

/**
 * Composes account-owned personal calendars with the shared season and native F03 presentation.
 * F05/F12 retain profile and admission ownership; follow lists keep their independent scope.
 */
export function PersonalScreen() {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const router = useRouter();
  const scope = usePersonalSeasonScope();
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
  ) : scope ? (
    <PersonalSpace key={scope.owner.generation} scope={scope} />
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
function PersonalSpace({ scope }: { scope: PersonalSeasonScope }) {
  const { owner, profile, season, request, usable, blocked, bypass } = scope;
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const focused = useIsFocused();

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
          onPress={() => router.push("/season")}
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
                  key={season.seasonId ?? "all-seasons"}
                  owner={owner}
                  request={request}
                  read={season.read}
                  seasonId={season.seasonId}
                  category={id}
                  active={focused && tab === id}
                  bypass={bypass}
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
