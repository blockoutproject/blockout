import { StyleSheet, View } from "react-native";
import { EntryGroup } from "../../../shared/components/entry-group";
import { FieldSkeleton } from "../../../shared/components/form-loading";
import { IdentityCardSkeleton } from "../../../shared/components/identity-card-loading";
import { EntryRowSkeleton } from "../../../shared/components/list-loading";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Whole initial Account body; editor reserves the real photo/fields/actions without exposing commands before admission. */
export function ProfileLoading({ editor = false }: { editor?: boolean }) {
  const { colors } = useTheme();
  return (
    <LoadingGroup label="Chargement du profil" style={styles.body}>
      {editor ? (
        <>
          <Surface>
            <View style={styles.photo}>
              <Skeleton width={144} />
              <View style={styles.field}>
                <View
                  style={[
                    styles.imageField,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Skeleton
                    width={tokens.size.media.profile}
                    height={tokens.size.media.profile}
                    shape="rectangle"
                  />
                  <View style={styles.copy}>
                    <Skeleton width="80%" />
                  </View>
                </View>
                <Skeleton
                  width="60%"
                  height={tokens.typography.metadata.lineHeight}
                />
              </View>
            </View>
          </Surface>
          <Surface>
            <View style={styles.form}>
              <View style={styles.field}>
                <FieldSkeleton labelWidth={72} />
                <Skeleton height={tokens.typography.metadata.lineHeight} />
                <Skeleton
                  width="70%"
                  height={tokens.typography.metadata.lineHeight}
                />
              </View>
              <View style={[styles.field, styles.readOnly]}>
                <FieldSkeleton labelWidth={144} />
                <Skeleton height={tokens.typography.metadata.lineHeight} />
              </View>
            </View>
          </Surface>
          <Skeleton height={tokens.size.control.default} shape="rectangle" />
          <Skeleton height={tokens.size.control.default} shape="rectangle" />
        </>
      ) : (
        <>
          <IdentityCardSkeleton />
          {[3, 2].map((count) => (
            <View key={count} style={styles.group}>
              <Skeleton width="42%" />
              <EntryGroup>
                {Array.from({ length: count }, (_, index) => (
                  <EntryRowSkeleton key={index} />
                ))}
              </EntryGroup>
            </View>
          ))}
        </>
      )}
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  group: { gap: tokens.spacing.md },
  photo: { gap: tokens.spacing.md },
  form: { gap: tokens.layout.form.gap },
  field: { gap: tokens.layout.form.labelGap },
  readOnly: { opacity: tokens.opacity.disabled },
  imageField: {
    flexDirection: "row",
    alignItems: "center",
    // The existing compact ImageField owns this minimum and its 64-point preview.
    minHeight: 84,
    gap: tokens.spacing.md,
    padding: tokens.spacing.compact,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.lg,
  },
  copy: { flex: 1, minWidth: 0 },
});
