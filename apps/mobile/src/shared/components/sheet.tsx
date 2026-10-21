import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import type { PropsWithChildren, ReactNode, RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/**
 * Standard Gorhom modal content. The owner opens it through the library ref and retains
 * field state, validation and confirmation; content unmounts on dismissal by default.
 * Use TextField's BottomSheetTextInput integration for fields inside this scrollable form.
 */
export interface SheetProps extends PropsWithChildren {
  ref: RefObject<BottomSheetModal | null>;
  title: string;
  message?: string;
  footer?: ReactNode;
}

/** Composes the library's default modal, scrolling and keyboard behavior with system safe areas. */
export function Sheet({ ref, title, message, footer, children }: SheetProps) {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={ref}
      accessible={false}
      topInset={top}
      backdropComponent={SheetBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.icon }}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tokens.spacing.lg + bottom },
        ]}
      >
        <View style={styles.introduction}>
          <View style={styles.titleRow}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
            <IconButton label="Fermer" onPress={() => ref.current?.dismiss()}>
              <Image
                source={require("../../../assets/icons/close.svg")}
                style={styles.closeIcon}
                tintColor={colors.icon}
                contentFit="contain"
              />
            </IconButton>
          </View>
          {message && (
            <Text style={[styles.message, { color: colors.secondaryText }]}>
              {message}
            </Text>
          )}
        </View>
        {children}
        {footer}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/** Dims at the single dynamic snap point, retaining the built-in opacity and press-to-close behavior. */
function SheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
  );
}

const styles = StyleSheet.create({
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  introduction: { gap: tokens.spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1 },
  closeIcon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
  message: tokens.typography.body,
});
