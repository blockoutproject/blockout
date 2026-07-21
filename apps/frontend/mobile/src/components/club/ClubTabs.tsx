import React, {useMemo, useRef} from "react";
import {Animated} from "react-native";

import GenericTabView from "@/src/shared/ui/GenericTabView";
import MatchList from "@/src/components/matchList/MatchListContainer";

import ClubInformationsTab from "./ClubInformationTab";
import ClubTeamListTab from "./ClubTeamListTab";
import ProUpsellTab from "./ProUpsellTab";

import {Club} from "@/src/types/Club";
import {TeamSummaryDTO} from "@/src/types/Team";
import {MatchStatus} from "@/src/types/Match";
import {TABBAR_HEIGHT} from "@/src/shared/theme/globals";
import {usePurchases} from "@/src/shared/providers/PurchasesProvider";

type ClubTabsProps = {
  club: Club;
  selectedSeason?: string;
  teams: TeamSummaryDTO[];
  teamIdsForMatches: number[];
  onRefreshTeams: () => Promise<any>;
  isTeamsLoading: boolean;
  isTeamsError: boolean;
  onTabChange?: (key: string) => void;
};

const ClubTabs: React.FC<ClubTabsProps> = ({
                                             club,
                                             teams,
                                             teamIdsForMatches,
                                             onRefreshTeams,
                                             isTeamsLoading,
                                             isTeamsError,
                                             onTabChange,
                                           }) => {
  const {isPro} = usePurchases();

  const tabs = useMemo(
    () => [
      {key: "info", title: "Informations"},
      {key: "teams", title: "Équipes"},
      {key: "upcoming", title: "À venir"},
      {key: "finished", title: "Terminés"},
    ],
    []
  );

  const scrollYs = useRef<Record<string, Animated.Value>>({
    info: new Animated.Value(0),
    upcoming: new Animated.Value(0),
    finished: new Animated.Value(0),
    teams: new Animated.Value(0),
  }).current;

  const informations = useMemo(
    () => <ClubInformationsTab club={club} scrollY={scrollYs.info}/>,
    [club, scrollYs]
  );

  const teamsTab = useMemo(() => (
    <ClubTeamListTab
      clubId={String(club.id)}
      teams={teams}
      isLoading={isTeamsLoading}
      isError={isTeamsError}
      onRefresh={onRefreshTeams}
      scrollY={scrollYs.teams}
    />
  ), [club.id, isPro, teams, isTeamsLoading, isTeamsError, onRefreshTeams, scrollYs]);

  const upcoming = useMemo(() => {
    if (!isPro) {
      return <ProUpsellTab subtitle="Accède aux matchs à venir du club avec Blockout Pro."/>;
    }

    return (
      <MatchList
        teamIds={teamIdsForMatches}
        status={MatchStatus.UPCOMING}
        scrollY={scrollYs.upcoming}
        headerOffset={TABBAR_HEIGHT}
        contentContainerStyle={[{paddingHorizontal: 4}]}
        home={false}
      />
    );
  }, [isPro, teamIdsForMatches, scrollYs]);

  const finished = useMemo(() => {
    if (!isPro) {
      return <ProUpsellTab subtitle="Accède aux matchs terminés du club avec Blockout Pro."/>;
    }

    return (
      <MatchList
        teamIds={teamIdsForMatches}
        status={MatchStatus.FINISHED}
        scrollY={scrollYs.finished}
        headerOffset={TABBAR_HEIGHT}
        contentContainerStyle={[{paddingHorizontal: 4}]}
        home={false}
      />
    );
  }, [isPro, teamIdsForMatches, scrollYs]);

  const renderTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.key === "info") return {...tab, render: () => informations};
        if (tab.key === "teams") return {...tab, render: () => teamsTab};
        if (tab.key === "upcoming") return {...tab, render: () => upcoming};
        if (tab.key === "finished") return {...tab, render: () => finished};
        return {...tab, render: () => null};
      }),
    [tabs, informations, upcoming, finished, teamsTab]
  );

  return <GenericTabView tabs={renderTabs} scrollYs={scrollYs} onTabChange={onTabChange}/>;
};

export default ClubTabs;
