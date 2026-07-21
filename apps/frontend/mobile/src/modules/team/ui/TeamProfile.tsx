import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import type { TeamResponse } from "@/src/modules/team/model/Team";
import { useTeamFollowState } from "@/src/modules/team/hooks/useTeamFollowState";
import FollowButton from "@/src/shared/ui/follow/FollowButton";
import FollowersCounter from "@/src/shared/ui/follow/FollowersCount";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";
import { LOGO_SIZE } from "@/src/shared/theme/tokens";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import InfoPillGradient from "@/src/shared/ui/chips/InfoPillGradient";
import { useSessionState } from "@/src/modules/session/providers/SessionContext";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/GuestPromptSheet";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { computeBalancedRowsByCount, withAlpha } from "@/src/utils/utils";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

export type TeamProfileProps = {
  enrichedTeam: TeamResponse;
};

const GAP = 6;

type PillConfig = {
  label: string;
  borderColor?: string;
  backgroundColor?: string;
};

const TeamProfile: React.FC<TeamProfileProps> = ({ enrichedTeam }) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    useTeamFollowState(enrichedTeam);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const gradient = [
    enrichedTeam.division.firstGradientColor,
    enrichedTeam.division.secondGradientColor,
    enrichedTeam.division.thirdGradientColor,
  ] as const;

  const pills: PillConfig[] = useMemo(() => {
    const arr: PillConfig[] = [];

    if (enrichedTeam.division.name) {
      const divColor = enrichedTeam.division.mainColor ?? theme.textSecondary;
      arr.push({
        label: enrichedTeam.division.name,
        borderColor: divColor,
        backgroundColor: withAlpha(divColor, 0.12),
      });
    }

    if (enrichedTeam.gender) {
      let genderColor: string;
      switch (enrichedTeam.gender) {
        case EnumGender.M:
          genderColor = theme.male;
          break;
        case EnumGender.F:
          genderColor = theme.female;
          break;
        case EnumGender.O:
        default:
          genderColor = theme.textSecondary;
          break;
      }

      arr.push({
        label: GenderLabels[enrichedTeam.gender],
        borderColor: genderColor,
        backgroundColor: withAlpha(genderColor, 0.12),
      });
    }

    if (enrichedTeam.format) {
      arr.push({
        label: FormatLabels[enrichedTeam.format],
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    if (enrichedTeam.season) {
      arr.push({
        label: enrichedTeam.season,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    return arr;
  }, [
    enrichedTeam.division.name,
    enrichedTeam.division.mainColor,
    enrichedTeam.gender,
    enrichedTeam.format,
    enrichedTeam.season,
    theme.male,
    theme.female,
    theme.textSecondary,
    theme.textInactive,
  ]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [widths, setWidths] = useState<number[]>(Array(pills.length).fill(0));

  useEffect(() => {
    setWidths(Array(pills.length).fill(0));
  }, [pills]);

  const ready =
    containerWidth > 0 &&
    widths.length === pills.length &&
    widths.every((w) => w > 0);

  const { top, bottom } = useMemo(() => {
    if (!ready) {
      const mid = Math.ceil(pills.length / 2);
      const idx = pills.map((_, i) => i);
      return { top: idx.slice(0, mid), bottom: idx.slice(mid) };
    }
    const rows = computeBalancedRowsByCount({
      containerWidth,
      pillWidths: widths,
      gap: GAP,
    });
    return { top: rows.topIndices, bottom: rows.bottomIndices };
  }, [ready, pills, containerWidth, widths]);

  const onContainer = (e: LayoutChangeEvent) => {
    setContainerWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width)));
  };

  const onMeasurePill = useCallback((i: number, e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setWidths((prev) => {
      if (prev[i] === w) return prev;
      const next = prev.slice();
      next[i] = w;
      return next;
    });
  }, []);

  const handleClubPress = useCallback(
    async (clubId: string) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/club/${clubId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

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
      <InfoPillGradient
        key={key}
        label={pill.label}
        size="md"
        variant="filled"
        gradient={undefined}
        borderWidth={1}
        backgroundColor={pill.backgroundColor ?? baseBg}
        borderColor={pill.borderColor ?? baseBorder}
        textColor={theme.textSecondary}
      />
    );
  };

  return (
    <View testID="team-profile">
      <View style={styles.container}>
        <MaskedImage uri={enrichedTeam.logoUrl} size={LOGO_SIZE} radius={20} />

        <View style={{ flex: 1 }}>
          <View onLayout={onContainer} style={styles.twoRows}>
            <View style={styles.pillsRow}>
              {top.map((i) => renderPill(pills[i], `pill-${i}`))}
            </View>

            <View style={styles.pillsRow}>
              {bottom.map((i) => renderPill(pills[i], `pill-bottom-${i}`))}

              <InfoPillGradient
                leftIcon="home"
                size="md"
                rightIcon="chevron-forward-outline"
                variant="filled"
                gradient={gradient}
                onPress={() => handleClubPress(enrichedTeam.clubId)}
              />
            </View>
          </View>

          {!ready && (
            <View pointerEvents="none" style={styles.measureRow}>
              {pills.map((pill, i) => (
                <View
                  key={`measure-${i}`}
                  onLayout={(e) => onMeasurePill(i, e)}
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
      </View>

      <GuestPromptSheet ref={guestSheetRef} />
    </View>
  );
};

export default TeamProfile;

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  twoRows: { gap: GAP },
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
