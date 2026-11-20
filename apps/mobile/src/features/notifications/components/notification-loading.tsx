import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "@/shared/components/loading-group";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { Skeleton } from "@/shared/components/skeleton";
import { tokens } from "@/shared/theme/tokens";
import {
  NotificationCard,
  notificationCardLayout as layout,
  notificationScoreSize,
  useNotificationTeamHeight,
} from "./notification-card-layout";

/** Three decorative cards reserve the inbox's first read within its ordinary page insets. */
export function NotificationLoading() {
  const teamHeight = useNotificationTeamHeight();
  return (
    <LoadingGroup label="Chargement des notifications" style={styles.items}>
      {Array.from({ length: 3 }, (_, index) => (
        <NotificationCard key={index}>
          <View style={layout.pool}>
            <Skeleton
              width={tokens.size.control.compact}
              height={tokens.size.control.compact}
              radius={tokens.media.radius.tile}
            />
            <View style={layout.identity}>
              <TextSkeleton width={198} role="label" />
              <TextSkeleton width={128} role="metadata" />
            </View>
          </View>
          <View>
            {[188, 164].map((width) => (
              <View
                key={width}
                style={[layout.team, { minHeight: teamHeight }]}
              >
                <Skeleton
                  width={tokens.size.icon.lg}
                  height={tokens.size.icon.lg}
                  radius={tokens.media.radius.compact}
                />
                <View style={layout.teamCopy}>
                  <TextSkeleton width={width} role="label" />
                </View>
                <View style={styles.score}>
                  <Skeleton
                    width={notificationScoreSize.width}
                    height={notificationScoreSize.height}
                    radius={tokens.radius.sm}
                  />
                </View>
              </View>
            ))}
          </View>
        </NotificationCard>
      ))}
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  items: { gap: tokens.layout.list.gap },
  score: { marginEnd: tokens.size.icon.sm + tokens.spacing.xs },
});
