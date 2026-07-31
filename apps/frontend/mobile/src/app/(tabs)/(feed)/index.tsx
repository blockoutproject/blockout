import { Redirect } from "expo-router";

import { useSessionState } from "@/src/modules/session/providers/session-context";
import FeedScreen from "@/src/modules/feed/ui/feed-screen";

export default function FeedRoute() {
  const { isAuthenticated } = useSessionState();

  return isAuthenticated ? <FeedScreen /> : <Redirect href="/search" />;
}
