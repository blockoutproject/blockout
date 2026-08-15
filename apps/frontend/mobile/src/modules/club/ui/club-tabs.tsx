import React, { useMemo, useRef } from "react";
import { Animated } from "react-native";

import EntityTabView from "@/src/shared/ui/entity/entity-tab-view";
import MatchList from "@/src/modules/match/ui/match-list";

import ClubInformationsTab from "./club-information-tab";
import ClubTeamListTab from "./club-team-list-tab";
import ProUpsellTab from "@/src/modules/subscription/ui/pro-upsell-tab";

import {
  type ClubResponse,
  MatchStatusEnum,
  type TeamSummaryResponse,
} from "@/src/shared/generated/models";
import { layout, spacing } from "@/src/shared/theme";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";

type ClubTabsProps = {
  club: ClubResponse;
  teams: TeamSummaryResponse[];
  teamIdsForMatches: number[];
  onRefreshTeams: () => Promise<unknown>;
  isTeamsLoading: boolean;
  isTeamsError: boolean;
  onTabChange?: (key: string) => void;
};

const CLUB_TABS = [
  { key: "info", title: "Informations" },
  { key: "teams", title: "Équipes" },
  { key: "upcoming", title: "À venir" },
  { key: "finished", title: "Terminés" },
] as const;

const ClubTabs: React.FC<ClubTabsProps> = ({
  club,
  teams,
  teamIdsForMatches,
  onRefreshTeams,
  isTeamsLoading,
  isTeamsError,
  onTabChange,
}) => {
  const { isPro } = usePurchases();

  const scrollYs = useRef<Record<string, Animated.Value>>({
    info: new Animated.Value(0),
    upcoming: new Animated.Value(0),
    finished: new Animated.Value(0),
    teams: new Animated.Value(0),
  }).current;

  const tabs = useMemo(
    () =>
      CLUB_TABS.map((tab) => ({
        ...tab,
        render: () => {
          if (tab.key === "info") {
            return <ClubInformationsTab club={club} scrollY={scrollYs.info} />;
          }
          if (tab.key === "teams") {
            return (
              <ClubTeamListTab
                teams={teams}
                isLoading={isTeamsLoading}
                isError={isTeamsError}
                onRefresh={onRefreshTeams}
                scrollY={scrollYs.teams}
              />
            );
          }
          if (!isPro) {
            return (
              <ProUpsellTab
                subtitle={
                  tab.key === "upcoming"
                    ? "Accède aux matchs à venir du club avec Blockout Pro."
                    : "Accède aux matchs terminés du club avec Blockout Pro."
                }
              />
            );
          }
          return (
            <MatchList
              teamIds={teamIdsForMatches}
              status={
                tab.key === "upcoming"
                  ? MatchStatusEnum.UPCOMING
                  : MatchStatusEnum.FINISHED
              }
              scrollY={scrollYs[tab.key]}
              headerOffset={layout.tabs}
              contentContainerStyle={[{ paddingHorizontal: spacing[1] }]}
              home={false}
            />
          );
        },
      })),
    [
      club,
      isPro,
      isTeamsError,
      isTeamsLoading,
      onRefreshTeams,
      scrollYs,
      teamIdsForMatches,
      teams,
    ],
  );

  return (
    <EntityTabView tabs={tabs} scrollYs={scrollYs} onTabChange={onTabChange} />
  );
};

export default ClubTabs;
