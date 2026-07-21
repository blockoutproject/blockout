import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {Ionicons, MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/context/ThemeProvider";
import {HEADER_HEIGHT} from "@/src/theme/globals";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useRouter} from "expo-router";

/** Header for team screen with back + report. */
export type TeamHeaderProps = {
  /** Screen title. */
  title?: string;
  /** Open report modal. */
  onOpenReport: () => void;
  /** Open edit team form. */
  onEdit?: () => void;

};

const TeamHeader: React.FC<TeamHeaderProps> = ({title, onOpenReport, onEdit}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
      testID="team-header"
    >
      <View
        style={styles.header}
      >
        <View
          style={styles.leftGroup}
        >
          <TouchableOpacity
            onPress={router.back}
            style={styles.backButton}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Ionicons
              name={"chevron-back-outline"}
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
            adjustsFontSizeToFit
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="highQuality"
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        <View style={styles.rightGroup}>
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={28}
                color={theme.text}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onOpenReport}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TeamHeader;

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 12,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    marginRight: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 1,
  },
});
