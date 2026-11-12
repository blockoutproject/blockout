import { StyleSheet, View, useWindowDimensions } from "react-native";
import { EntryGroup } from "../../../shared/components/entry-group";
import { IdentityCard } from "../../../shared/components/identity-card";
import { EntryRowSkeleton } from "../../../shared/components/list-loading";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { SingleImageFieldSkeleton } from "../../../shared/components/single-image-field";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

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
          <Skeleton height={actionHeight} shape="rectangle" />
          <Skeleton height={actionHeight} shape="rectangle" />
        </>
      ) : (
        <>
          <ProfileIdentitySkeleton />
          <View style={styles.group}>
            <TextSkeleton role="label" width={144} />
            <View style={styles.legalLinks}>
              <EntryGroup>
                <EntryRowSkeleton />
                <EntryRowSkeleton />
                <EntryRowSkeleton />
              </EntryGroup>
              <TextSkeleton role="metadata" width={292} />
            </View>
          </View>
          <View style={styles.group}>
            <TextSkeleton role="label" width={144} />
            <EntryGroup>
              <EntryRowSkeleton />
              <EntryRowSkeleton />
            </EntryGroup>
          </View>
          <Skeleton height={actionHeight} shape="rectangle" />
          <Skeleton height={actionHeight} shape="rectangle" />
          <View style={styles.version}>
            <TextSkeleton role="metadata" width={72} />
          </View>
        </>
      )}
    </LoadingGroup>
  );
}

/** Profile identity has its own membership, name and email slots inside the shared identity frame. */
function ProfileIdentitySkeleton() {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <IdentityCard
      railBackgroundColor={colors.skeletonHeader}
      artworkBackgroundColor={colors.skeleton}
      artwork={
        <Skeleton
          width={tokens.size.media.profile}
          height={tokens.size.media.profile}
          shape="rectangle"
          radius={tokens.media.radius.profile}
        />
      }
    >
      <View style={styles.identity}>
        <Skeleton
          width={
            72 * fontScale + 2 * (tokens.spacing.tight + tokens.border.thin)
          }
          height={
            tokens.typography.metadata.lineHeight * fontScale +
            tokens.spacing.xs * 2 +
            tokens.border.thin * 2
          }
          shape="rectangle"
        />
        <TextSkeleton role="title" width={126 * fontScale} />
        <TextSkeleton role="label" width={132 * fontScale} />
      </View>
    </IdentityCard>
  );
}

/** Keeps the editable username and disabled email group at the real text-field and helper sizes. */
function EditorFieldsSkeleton() {
  const { fontScale } = useWindowDimensions();
  const enlarged = fontScale >= 1.6;
  const fieldHeight = Math.max(
    tokens.size.control.default,
    tokens.typography.body.lineHeight * fontScale +
      2 * (tokens.spacing.md + tokens.border.thin),
  );
  return (
    <Surface>
      <View style={styles.form}>
        <View style={styles.field}>
          <TextSkeleton role="label" width={39 * fontScale} />
          <Skeleton height={fieldHeight} shape="rectangle" />
          <View>
            {Array.from({ length: enlarged ? 4 : 1 }, (_, index) => (
              <TextSkeleton key={index} role="metadata" />
            ))}
            <TextSkeleton role="metadata" width="85%" />
          </View>
        </View>
        <View style={[styles.field, styles.readOnly]}>
          <TextSkeleton role="label" width={91 * fontScale} />
          <Skeleton height={fieldHeight} shape="rectangle" />
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
  legalLinks: { gap: tokens.spacing.sm },
  identity: { gap: tokens.spacing.sm },
  version: { alignItems: "center" },
  form: { gap: tokens.layout.form.gap },
  field: { gap: tokens.layout.form.labelGap },
  readOnly: { opacity: tokens.opacity.disabled },
});
