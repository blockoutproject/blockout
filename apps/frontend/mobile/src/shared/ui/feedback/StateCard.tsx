import React, {useEffect, useRef} from "react";
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
import {Image} from "expo-image";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/theme";
import {withAlpha} from "@/src/shared/lib/utils";

/** Button-like action attached to the state card. */
export type StateAction = {
  /** Visible label. */
  label: string;
  /** Press handler. */
  onPress: () => void;
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

const StateCard: React.FC<StateCardProps> = ({
                                               title,
                                               subtitle,
                                               illustrationSource,
                                               fallbackIcon,
                                               action,
                                               containerStyle,
                                               testID,
                                             }) => {
  const theme = useAppTheme();

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const onPressAction = async () => {
    if (!action || action.disabled || action.loading) {
      return;
    }
    await Haptics.selectionAsync();
    action.onPress();
  };

  const isActionDisabled = Boolean(action?.disabled || action?.loading);

  return (
    <Animated.View
      style={[
        styles.root,
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
        style={styles.centerStack}
      >
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
              name={fallbackIcon ?? "information-outline"}
              size={44}
              color={withAlpha(theme.text, 0.6)}
            />
          )}
        </View>

        <Text
          style={[
            styles.title,
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
                color: theme.textInactive,
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
            style={({pressed}) => [
              styles.button,
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
              busy: Boolean(action.loading),
            }}
            testID={action.testID}
          >
            <View
              style={styles.btnContent}
            >
              <View
                style={[
                  styles.iconSlot,
                  {
                    width: ICON_SLOT,
                  },
                ]}
              >
                {action.loading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.text}
                  />
                ) : action.icon ? (
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={ICON_SIZE}
                    color={theme.text}
                  />
                ) : null}
              </View>
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {action.loading && action.loadingLabel
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
    paddingHorizontal: 16,
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
});
