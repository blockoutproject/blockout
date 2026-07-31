import { Redirect } from "expo-router";

import { useSessionState } from "@/src/modules/session/providers/session-context";
import NotificationsScreen from "@/src/modules/notifications/ui/notifications-screen";

export default function NotificationsRoute() {
  const { isAuthenticated } = useSessionState();

  return isAuthenticated ? (
    <NotificationsScreen />
  ) : (
    <Redirect href="/search" />
  );
}
