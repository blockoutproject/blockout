import { MutationObserver, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth0 } from "react-native-auth0";
import { z } from "zod";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { refreshInbox, refreshNotificationSummary } from "../api/inbox-queries";
import { useInboxQueries } from "../api/use-inbox-queries";
import type { PushRegistration } from "./push-registration";
import { useActionFeedback } from "../../../shared/components/action-feedback";

// SDK 58 otherwise presents foreground messages while F14/native authentication is still initializing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const routing = z.object({
  ownerAccountId: z.string().uuid(),
  notificationId: z.string().uuid(),
  matchId: z.string().uuid(),
});

/** Root-owned SDK subscriptions; current ordinary navigation is supplied by the existing access/discovery owners. */
export interface NotificationLifecycleProps {
  registration: PushRegistration;
  enabled: boolean;
}

/** Connects ordinary native occasions, silent receipt refresh and one-time taps to existing session/Query owners. */
export function NotificationLifecycle({
  registration,
  enabled,
}: NotificationLifecycleProps) {
  const { session, owner, queries, account } = useInboxQueries();
  const { generation, accountId, isCurrent, getSnapshot, subscribe } = session;
  const client = useQueryClient();
  const auth = useAuth0();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const feedback = useActionFeedback();
  const handled = useRef<string | undefined>(undefined);
  const projectId: unknown =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  const available = enabled && !!queries;
  const ready =
    enabled &&
    !!navigation?.key &&
    !["restoring", "authenticating", "signing-out"].includes(session.status) &&
    !(session.status === "authenticated" && account.isPending);

  useLayoutEffect(() => {
    const reset = () => registration.reset(getSnapshot());
    reset();
    const unsubscribe = subscribe(reset);
    return () => {
      unsubscribe();
      registration.reset({ generation: "unmounted", accountId: null });
    };
  }, [registration, subscribe, getSnapshot]);

  const register = useEffectEvent(
    (devicePushToken?: Notifications.DevicePushToken) => {
      if (!available || !queries || typeof projectId !== "string" || !projectId)
        return;
      void registration.register(
        owner,
        projectId,
        queries.request,
        auth.getCredentials,
        devicePushToken,
      );
    },
  );
  const refresh = useEffectEvent(() => {
    if (!queries) return;
    void Promise.allSettled([
      client.getQueryData(queries.inbox.queryKey)
        ? refreshInbox(client, queries)
        : Promise.resolve(),
      refreshNotificationSummary(client, queries),
    ]);
  });
  const open = useEffectEvent(
    (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
        return;
      const key = response.notification.request.identifier;
      if (handled.current === key) return;
      handled.current = key;
      const data = routing.safeParse(
        response.notification.request.content.data,
      );
      // Consume remembered tap context without inspecting or dismissing presented notifications.
      Notifications.clearLastNotificationResponse();
      if (!data.success) return;
      if (
        queries &&
        data.data.ownerAccountId === owner.accountId &&
        owner.isCurrent(owner.generation)
      ) {
        const observer = new MutationObserver(client, {
          ...createReadNotificationOptions(client, owner, queries),
          gcTime: 0,
        });
        void observer
          .mutate(data.data.notificationId)
          .catch(() => {
            if (owner.isCurrent(owner.generation)) feedback.error();
          })
          .finally(() => observer.reset());
      }
      try {
        router.push({
          pathname: "/matches/[matchId]",
          params: { matchId: data.data.matchId },
        });
      } catch {
        if (owner.isCurrent(owner.generation)) feedback.error();
      }
    },
  );

  useEffect(() => {
    if (!available) return;
    const original = generation;
    register();
    const token = Notifications.addPushTokenListener((devicePushToken) => {
      if (isCurrent(original)) register(devicePushToken);
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active" && isCurrent(original)) register();
    });
    return () => {
      token.remove();
      foreground.remove();
      registration.cancel();
    };
  }, [available, generation, accountId, isCurrent, registration]);

  useEffect(() => {
    if (!ready) return;
    const original = generation;
    const receive = Notifications.addNotificationReceivedListener(() => {
      if (isCurrent(original)) refresh();
    });
    const tap = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (isCurrent(original)) open(response);
      },
    );
    const initial = Notifications.getLastNotificationResponse();
    if (initial) open(initial);
    return () => {
      receive.remove();
      tap.remove();
    };
  }, [ready, generation, isCurrent]);
  return null;
}
