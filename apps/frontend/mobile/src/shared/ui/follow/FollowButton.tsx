import React from 'react';
import {GestureResponderEvent, StyleSheet, Text, TouchableOpacity} from 'react-native';
import * as Haptics from 'expo-haptics';
import {radius, useAppTheme} from "@/src/shared/theme";
import GradientView from '../GradientView'; // adapte les chemins si besoin
import GradientBorderView from '../GradientBorderView';

type Props = {
  isFollowing: boolean;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  gradient: readonly [string, string, ...string[]];
};

const FollowButton: React.FC<Props> = ({isFollowing, onPress, disabled, gradient}) => {
  const theme = useAppTheme();

  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(e);
  };

  const buttonContent = (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <Text style={[styles.text, {color: isFollowing ? theme.text : 'white'}]}>
        {isFollowing ? 'Suivie' : 'Suivre'}
      </Text>
    </TouchableOpacity>
  );

  return isFollowing ? (
    <GradientBorderView
      gradient={gradient}
      borderRadius={radius.full}
      borderWidth={2}
      style={{backgroundColor: theme.background}}
    >
      {buttonContent}
    </GradientBorderView>
  ) : (
    <GradientView
      gradient={gradient}
      style={styles.gradientFilled}
    >
      {buttonContent}
    </GradientView>
  );
};

const styles = StyleSheet.create({
  text: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  gradientFilled: {
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
});

export default FollowButton;
