import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { PoolResponse } from "@/src/shared/generated/models";
import FollowButton from "@/src/shared/ui/follow/FollowButton";
import FollowersCounter from "@/src/shared/ui/follow/FollowersCount";
import { usePoolFollowState } from "@/src/modules/pool/hooks/usePoolFollowState";
import { GenderEnum, GenderLabels } from "@/src/shared/model/genderLabels";
import {layout, useAppTheme} from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import { computeBalancedRowsByCount, withAlpha } from "@/src/shared/lib/utils";
import { useSessionState } from "@/src/modules/session/providers/SessionContext";

import {Pill} from "@/src/shared/ui/pill";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/guest-prompt-sheet";

export type PoolProfileProps = {
  enrichedPool: PoolResponse;
};

const GAP = 6;

// Petit type local pour décrire une pill
type PillConfig = {
  label: string;
  borderColor?: string;
  backgroundColor?: string;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ enrichedPool }) => {
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    usePoolFollowState(enrichedPool);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const division = enrichedPool.division;
  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const pillsData: PillConfig[] = useMemo(() => {
    const pills: PillConfig[] = [];

    if (enrichedPool.leagueName) {
      pills.push({
        label: enrichedPool.leagueName,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    if (division.name) {
      const divColor = division.mainColor ?? theme.textSecondary;
      pills.push({
        label: division.name,
        borderColor: divColor,
        backgroundColor: withAlpha(divColor, 0.12),
      });
    }

    if (enrichedPool.gender) {
      let genderColor: string;
      switch (enrichedPool.gender) {
        case GenderEnum.M:
          genderColor = theme.male;
          break;
        case GenderEnum.F:
          genderColor = theme.female;
          break;
        case GenderEnum.O:
        default:
          genderColor = theme.textSecondary;
          break;
      }

      pills.push({
        label: GenderLabels[enrichedPool.gender],
        borderColor: genderColor,
        backgroundColor: withAlpha(genderColor, 0.12),
      });
    }

    if (enrichedPool.season) {
      pills.push({
        label: enrichedPool.season,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    return pills;
  }, [
    enrichedPool.leagueName,
    enrichedPool.gender,
    enrichedPool.season,
    division.name,
    division.mainColor,
    theme.male,
    theme.female,
    theme.textSecondary,
    theme.textInactive,
  ]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [pillWidths, setPillWidths] = useState<number[]>([]);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    setPillWidths(Array(pillsData.length).fill(0));
    setMeasured(false);
  }, [pillsData]);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width)));
  };

  const handleMeasurePill = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const w = Math.ceil(e.nativeEvent.layout.width);
      setPillWidths((prev) => {
        if (prev[index] === w) return prev;
        const next = prev.slice();
        next[index] = w;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (containerWidth <= 0) return;
    if (pillWidths.length !== pillsData.length) return;
    if (pillWidths.some((w) => w <= 0)) return;
    setMeasured(true);
  }, [containerWidth, pillWidths, pillsData.length]);

  const { topIndices, bottomIndices } = useMemo(() => {
    if (!measured) {
      const mid = Math.ceil(pillsData.length / 2);
      return {
        topIndices: pillsData.map((_, i) => i).slice(0, mid),
        bottomIndices: pillsData.map((_, i) => i).slice(mid),
      };
    }
    return computeBalancedRowsByCount({ containerWidth, pillWidths, gap: GAP });
  }, [measured, pillsData, containerWidth, pillWidths]);

  const handleFollow = () => {
    if (isGuest) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      guestSheetRef.current?.present();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onToggleFollow();
    }
  };

  useEffect(() => {
    if (!isGuest) {
      guestSheetRef.current?.dismiss();
    }
  }, [isGuest]);

  const renderPill = (pill: PillConfig, key: string | number) => {
    const baseBorder = withAlpha(theme.text, 0.12);
    const baseBg = withAlpha(theme.surface, 0.95);

    return (
      <Pill
        key={key}
        label={pill.label}
        size="md"

        borderWidth={1}
        backgroundColor={pill.backgroundColor ?? baseBg}
        borderColor={pill.borderColor ?? baseBorder}
        textColor={theme.textSecondary}
      />
    );
  };

  return (
    <View style={styles.container} testID="pool-profile">
      <MaskedImage uri={division.logoUrl} size={layout.logoHero} radius={20} shadow />

      <View style={{ flex: 1 }}>
        <View onLayout={handleContainerLayout} style={styles.twoRows}>
          <View style={styles.pillsRow}>
            {topIndices.map((i) => renderPill(pillsData[i], `pill-${i}`))}
          </View>
          <View style={styles.pillsRow}>
            {bottomIndices.map((i) => renderPill(pillsData[i], `pill-${i}`))}
          </View>
        </View>

        {!measured && (
          <View pointerEvents="none" style={styles.measureRow}>
            {pillsData.map((pill, i) => (
              <View
                key={`measure-${i}`}
                onLayout={(e) => handleMeasurePill(i, e)}
              >
                {renderPill(pill, `measure-pill-${i}`)}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsRow}>
          <FollowButton
            isFollowing={isFollowing}
            onPress={handleFollow}
            disabled={isProcessing}
            gradient={gradient}
          />
          <FollowersCounter count={followersCount} />
        </View>
      </View>

      <GuestPromptSheet ref={guestSheetRef} />
    </View>
  );
};

export default PoolProfile;

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  twoRows: {
    gap: GAP,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: GAP,
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  measureRow: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: GAP,
  },
});
