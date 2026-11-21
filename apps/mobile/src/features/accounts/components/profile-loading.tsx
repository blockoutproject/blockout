import { StyleSheet, View, useWindowDimensions } from "react-native";
import { EntryGroup } from "@/shared/components/entry-group";
import { FieldSkeleton } from "@/shared/components/form-loading";
import { IdentityCard } from "@/shared/components/identity-card";
import { EntryRowSkeleton } from "@/shared/components/list-loading";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { SingleImageFieldSkeleton } from "@/shared/components/single-image-field";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Selects the account overview or its photo/fields editor for an initial read without content. */
export interface ProfileLoadingProps {
  editor?: boolean;
}

/** Reserves one complete initial account body; the owning read retains content during later refreshes. */
export function ProfileLoading({
  editor = false,
}: Readonly<ProfileLoadingProps>) {
  const { fontScale } = useWindowDimensions();
  const actionHeight = Math.max(
    tokens.size.control.default,
    tokens.typography.strong.lineHeight * fontScale + tokens.spacing.sm * 2,
  );
  return (
    <LoadingGroup label="Chargement du profil" style={styles.body}>
      {editor ? (
        <>
          <SingleImageFieldSkeleton />
          <EditorFieldsSkeleton />
        </>
      ) : (
        <>
          <ProfileIdentitySkeleton />
          <View style={styles.group}>
            <TextSkeleton role="label" width={144} />
            <EntryGroup>
              <EntryRowSkeleton />
              <EntryRowSkeleton />
              <EntryRowSkeleton />
            </EntryGroup>
          </View>
          <View style={styles.group}>
            <TextSkeleton role="label" width={144} />
            <EntryGroup>
              <EntryRowSkeleton />
              <EntryRowSkeleton />
            </EntryGroup>
          </View>
        </>
      )}
      <View style={styles.actions}>
        <Skeleton height={actionHeight} shape="rectangle" />
        <Skeleton height={actionHeight} shape="rectangle" />
      </View>
      {!editor && (
        <View style={styles.version}>
          <TextSkeleton role="metadata" width={72} />
        </View>
      )}
    </LoadingGroup>
  );
}

/** Reserves the photo, name and email in the shared identity frame. */
function ProfileIdentitySkeleton() {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <IdentityCard artwork={null} artworkBackgroundColor={colors.skeleton}>
      <TextSkeleton role="title" width={126 * fontScale} />
      <TextSkeleton role="label" width={132 * fontScale} />
    </IdentityCard>
  );
}

/** Keeps the editable username and disabled email group at the real text-field and helper sizes. */
function EditorFieldsSkeleton() {
  const { fontScale } = useWindowDimensions();
  const enlarged = fontScale >= 1.6;
  return (
    <Surface>
      <View style={styles.form}>
        <FieldSkeleton labelWidth={39 * fontScale} />
        <View style={[styles.field, styles.readOnly]}>
          <FieldSkeleton labelWidth={91 * fontScale} />
          <View>
            <TextSkeleton role="metadata" />
            {enlarged && <TextSkeleton role="metadata" />}
            <TextSkeleton role="metadata" width="74%" />
          </View>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  group: { gap: tokens.spacing.md },
  actions: { gap: tokens.layout.actions.gap },
  version: { alignItems: "center" },
  form: { gap: tokens.layout.form.gap },
  field: { gap: tokens.layout.form.labelGap },
  readOnly: { opacity: tokens.opacity.disabled },
});
