import React from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import {Ionicons, MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {withAlpha} from "@/src/utils/utils";

/** Single info row for club details. */
export type ClubInfoRowProps = {
  /** MC icon name. */
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Row label. */
  label: string;
  /** Row value (null hides the row). */
  value: string | null;
  /** Optional press handler. */
  onPress?: () => void;
  /** Display value as link color/underline. */
  isLink?: boolean;
};

export const InfoRow: React.FC<ClubInfoRowProps> = ({icon, label, value, onPress, isLink}) => {
  const theme = useAppTheme();
  if (!value) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{
        color: withAlpha(theme.text, 0.06),
      }}
      style={({pressed}) => [
        styles.row,
        pressed
          ? {
            backgroundColor: withAlpha(theme.text, 0.03),
            transform: [{scale: 0.996}],
          }
          : null,
      ]}
      testID="club-info-row"
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: withAlpha(theme.text, 0.06),
            borderColor: withAlpha(theme.text, 0.2),
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={theme.text}
        />
      </View>

      <View
        style={styles.rowText}
      >
        <Text
          style={[
            styles.label,
            {
              color: withAlpha(theme.text, 0.7),
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            {
              color: isLink ? theme.primary : theme.text,
            },
            isLink ? styles.underline : null,
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward-outline"
          size={20}
          color={withAlpha(theme.text, 0.5)}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );
};

/** Card container grouping multiple info rows. */
export type ClubInfoCardProps = {
  /** Section title. */
  title: string;
  /** Rows content. */
  children: React.ReactNode;
};

export const InfoCard: React.FC<ClubInfoCardProps> = ({title, children}) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: withAlpha(theme.text, 0.12),
        },
      ]}
      testID="club-info-card"
    >
      <Text
        style={[
          styles.cardTitle,
          {
            color: theme.text,
          },
        ]}
      >
        {title}
      </Text>
      <View
        style={styles.cardBody}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardBody: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
  },
  underline: {
    textDecorationLine: "underline",
  },
  chevron: {
    marginLeft: 4,
  },
});
