import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { useInboxQueries } from "../api/use-inbox-queries";
import { refreshInbox, subscribeInboxVisibility } from "../api/inbox-queries";

/** Keeps private refusals current and checks retained age on ordinary foreground returns. */
export function NotificationState({ children }: Readonly<PropsWithChildren>) {
  const client = useQueryClient();
  const { queries } = useInboxQueries();
  const refresh = useEffectEvent(() => {
    if (queries && client.getQueryData(queries.inbox.queryKey)) {
      void refreshInbox(client, queries).catch(() => undefined);
    }
  });
  useEffect(() => subscribeInboxVisibility(client), [client]);
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
