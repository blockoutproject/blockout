import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import RankingCard from './RankingCard';
import {useAppTheme} from '@/src/shared/providers/ThemeProvider';
import type {PoolResponse} from '@/src/modules/pool/model/Pool';
import {BOTTOM_TABBAR_HEIGHT, SECTION_SEPARATOR_HEIGHT, TABBAR_HEIGHT} from '@/src/shared/theme/tokens';
import type {TeamHighlight} from '@/src/modules/team/model/Team';
import FadeIn from '@/src/shared/ui/animations/FadeIn';

type Props = {
  enrichedPool: PoolResponse
  highlightTeams?: TeamHighlight[];
};

const RankingTab: React.FC<Props> = ({enrichedPool, highlightTeams}) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginTop: TABBAR_HEIGHT + 8,
          paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT + 4,
          backgroundColor: theme.background
        },
      ]}
    >
      <FadeIn>
        <RankingCard enrichedPool={enrichedPool} highlightTeams={highlightTeams}/>
      </FadeIn>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
  },
});

export default RankingTab;
