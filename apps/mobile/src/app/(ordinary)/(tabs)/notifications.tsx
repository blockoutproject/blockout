import { Redirect } from "expo-router";
import { useAccountSession } from "../../../features/accounts/current-account";
import { NotificationsScreen } from "../../../features/notifications/screens/notifications-screen";

/** Thin ordinary route; F05/F12 and F07 retain admission, data and interaction ownership. */
export default function NotificationsRoute() {
  const session = useAccountSession();
  if (session.status === "guest") return <Redirect href="/search" />;
  return <NotificationsScreen />;
}
