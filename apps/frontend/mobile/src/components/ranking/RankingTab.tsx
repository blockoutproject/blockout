import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import RankingCard from './RankingCard';
import {useAppTheme} from '@/src/context/ThemeProvider';
import {EnrichedPoolDTO} from '@/src/types/Pool';
import {BOTTOM_TABBAR_HEIGHT, SECTION_SEPARATOR_HEIGHT, TABBAR_HEIGHT} from '@/src/theme/globals';
import {TeamHighlight} from '@/src/types/Team';
import FadeIn from '../common/animations/FadeIn';

type Props = {
  enrichedPool: EnrichedPoolDTO
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
