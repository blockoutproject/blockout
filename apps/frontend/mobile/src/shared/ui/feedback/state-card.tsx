import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";

/** Button-like action attached to the state card. */
export type StateAction = {
  /** Visible label. */
  label: string;
  /** Press handler. */
  onPress: () => void | Promise<unknown>;
  /** Optional icon name. */
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Test id for E2E. */
  testID?: string;
  /** Show loading indicator. */
  loading?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional alternate label while loading. */
  loadingLabel?: string;
};

/** Visual state card with optional illustration and action. */
export type StateCardProps = {
  /** Approved feedback anatomy. */
  variant?: "loading" | "empty" | "search" | "error";
  /** Main title (required). */
  title: string;
  /** Optional subtitle. */
  subtitle?: string;
  /** Optional illustration image. */
  illustrationSource?: ImageSourcePropType;
  /** Fallback icon name if no illustration. */
  fallbackIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Optional primary action. */
  action?: StateAction;
  /** External container style. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Test id for the root element. */
  testID?: string;
};

const ICON_SLOT = 20;
const ICON_SIZE = 16;
const feedbackIcons: Record<
  NonNullable<StateCardProps["variant"]>,
  React.ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  loading: "progress-clock",
  empty: "inbox-outline",
  search: "magnify",
  error: "alert-circle-outline",
};

const StateCard: React.FC<StateCardProps> = ({
  variant = "empty",
  title,
  subtitle,
  illustrationSource,
  fallbackIcon,
  action,
  containerStyle,
  testID,
}) => {
  const theme = useAppTheme();
  const [actionPending, setActionPending] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const onPressAction = async () => {
    if (!action || action.disabled || action.loading || actionPending) {
      return;
    }

    setActionPending(true);
    try {
      await Haptics.selectionAsync();
      await Promise.resolve(action.onPress());
    } finally {
      setActionPending(false);
    }
  };

  const isActionLoading = Boolean(action?.loading || actionPending);
  const isActionDisabled = Boolean(action?.disabled || isActionLoading);
  const isCompact = variant !== "empty";
  const effectiveFallbackIcon = fallbackIcon ?? feedbackIcons[variant];
  const indicatorColor = {
    loading: theme.primary,
    search: theme.warning,
    error: theme.error,
  }[variant as "loading" | "search" | "error"];

  return (
    <Animated.View
      style={[
        styles.root,
        !isCompact && styles.emptyRoot,
        {
          backgroundColor: theme.background,
          opacity: fade,
        },
        containerStyle,
      ]}
      testID={testID}
      accessibilityRole="summary"
    >
      <View
        style={[
          isCompact ? styles.compactCard : styles.centerStack,
          isCompact && {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {isCompact ? (
          <View
            style={[
              styles.compactIndicator,
              { backgroundColor: indicatorColor },
            ]}
          />
        ) : (
          <View
            style={[
              styles.visualWrap,
              {
                backgroundColor: withAlpha(theme.text, 0.06),
              },
            ]}
            accessible
            accessibilityLabel="Illustration"
          >
            {illustrationSource ? (
              <Image
                source={illustrationSource}
                style={styles.image}
                contentFit="contain"
              />
            ) : (
              <MaterialCommunityIcons
                name={effectiveFallbackIcon}
                size={44}
                color={withAlpha(theme.text, 0.6)}
              />
            )}
          </View>
        )}

        <Text
          style={[
            isCompact ? styles.compactTitle : styles.title,
            {
              color: theme.text,
            },
          ]}
          numberOfLines={2}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {Boolean(subtitle) && (
          <Text
            style={[
              styles.subtitle,
              {
                color: isCompact ? theme.textSecondary : theme.textInactive,
              },
            ]}
            numberOfLines={4}
            accessibilityHint={subtitle}
          >
            {subtitle}
          </Text>
        )}

        {!!action && (
          <Pressable
            onPress={onPressAction}
            disabled={isActionDisabled}
            android_ripple={{
              color: withAlpha(theme.text, 0.12),
            }}
            style={({ pressed }) => [
              isCompact ? styles.compactButton : styles.button,
              {
                backgroundColor:
                  pressed && !isActionDisabled
                    ? withAlpha(theme.primary, 0.9)
                    : theme.primary,
                opacity: isActionDisabled ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{
              disabled: isActionDisabled,
              busy: isActionLoading,
            }}
            hitSlop={isCompact ? spacing[1] : undefined}
            testID={action.testID}
          >
            <View style={styles.btnContent}>
              {!isCompact && (
                <View
                  style={[
                    styles.iconSlot,
                    {
                      width: ICON_SLOT,
                    },
                  ]}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : action.icon ? (
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={ICON_SIZE}
                      color={theme.text}
                    />
                  ) : null}
                </View>
              )}
              <Text
                style={[
                  isCompact ? styles.compactButtonText : styles.buttonText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {isActionLoading && action.loadingLabel
                  ? action.loadingLabel
                  : action.label}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

export default StateCard;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyRoot: {
    paddingHorizontal: 16,
  },
  compactCard: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    gap: spacing[3],
    marginHorizontal: spacing[2],
    padding: spacing[4],
  },
  compactIndicator: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  compactTitle: {
    ...typography.control,
    textAlign: "center",
  },
  centerStack: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 24,
    gap: 12,
  },
  visualWrap: {
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  title: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
    maxWidth: 320,
  },
  button: {
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "center",
  },
  compactButton: {
    alignSelf: "center",
    borderRadius: radius.control,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconSlot: {
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  compactButtonText: {
    ...typography.bodyStrong,
  },
});
