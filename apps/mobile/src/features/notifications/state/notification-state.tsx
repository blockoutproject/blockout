import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { useInboxQueries } from "../api/use-inbox-queries";
import { refreshRetainedInbox } from "../api/inbox-queries";

/** Refreshes the current owner’s retained inbox and age on ordinary foreground returns. */
export function NotificationState({ children }: Readonly<PropsWithChildren>) {
  const client = useQueryClient();
  const { queries } = useInboxQueries();
  const refresh = useEffectEvent(() => {
    refreshRetainedInbox(client, queries);
  });
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });
    return () => listener.remove();
  }, []);
  return children;
}
