import { MutationObserver, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { AppState } from "react-native";
import { z } from "zod";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { refreshInbox } from "../api/inbox-queries";
import { useInboxQueries } from "../api/use-inbox-queries";
import type { PushRegistration } from "./push-registration";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useSportingTransition } from "@/features/advertising/use-sporting-transition";

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

/** Keeps registration and receipt with their session/Query owners, consuming taps only after root gate redirects settle. */
export function NotificationLifecycle({
  registration,
  enabled,
}: Readonly<NotificationLifecycleProps>) {
  const { session, owner, queries, account } = useInboxQueries();
  useEffect(() => {
    // A prior app version may have left a count; unsupported native clearing never blocks startup.
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
  }, []);
  const { subject, accountId } = session;
  const client = useQueryClient();
  const transition = useSportingTransition();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const [rootGroup] = useSegments();
  const feedback = useActionFeedback();
  const handled = useRef<string | undefined>(undefined);
  const projectId: unknown =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  const available = enabled && !!queries;
  const ready =
    enabled &&
    !!navigation?.key &&
    // Protected-route redirects settle before a remembered tap is consumed; operations retain ordinary tap access.
    (rootGroup === "(ordinary)" || rootGroup === "(operations)") &&
    !["restoring", "authenticating", "signing-out"].includes(session.status) &&
    !(
      session.status === "authenticated" &&
      (account.isPending || (accountId === null && !account.isError))
    );
  useLayoutEffect(() => {
    registration.reset({ subject, accountId });
    return () => registration.reset({ subject: null, accountId: null });
  }, [registration, subject, accountId]);
  /** Current registration credentials stay with the original inbox owner and existing push boundary. */
  const register = useEffectEvent(
    (devicePushToken?: Notifications.DevicePushToken) => {
      if (
        !available ||
        !queries ||
        typeof projectId !== "string" ||
        !projectId
      ) {
        return;
      }
      void registration.register(
        owner,
        projectId,
        queries.request,
        session.getCredentials,
        devicePushToken,
      );
    },
  );
  /** Receipt rereads are silent and refresh only an already-observed inbox. */
  const refresh = useEffectEvent(() => {
    if (!queries) {
      return;
    }
    if (client.getQueryData(queries.inbox.queryKey)) {
      void refreshInbox(client, queries).catch(() => undefined);
    }
  });
  /** Consumes each remembered response once; reading and navigation stay independent under one tap's feedback. */
  const open = useEffectEvent(
    (response: Notifications.NotificationResponse) => {
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }
      const key = response.notification.request.identifier;
      if (handled.current === key) {
        return;
      }
      handled.current = key;
      const data = routing.safeParse(
        response.notification.request.content.data,
      );
      // Consume remembered tap context without inspecting or dismissing presented notifications.
      Notifications.clearLastNotificationResponse();
      if (!data.success) {
        return;
      }
      let reported = false;

      /** The consumed native tap owns both outcomes; its second failure never repeats the same notice. */
      function reportFailure() {
        if (reported) {
          return;
        }
        reported = true;
        feedback.error();
      }

      if (queries && data.data.ownerAccountId === owner.accountId) {
        const observer = new MutationObserver(client, {
          ...createReadNotificationOptions(client, owner, queries),
          gcTime: 0,
        });
        void observer
          .mutate(data.data.notificationId)
          .catch(reportFailure)
          .finally(() => observer.reset());
      }
      void transition.open({
        kind: "match",
        target: data.data.matchId,
        open: () =>
          router.push({
            pathname: "/matches/[matchId]",
            params: { matchId: data.data.matchId },
          }),
        onFailure: reportFailure,
      });
    },
  );
  useEffect(() => {
    if (!available) {
      return;
    }

    register();
    const token = Notifications.addPushTokenListener((devicePushToken) => {
      register(devicePushToken);
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        register();
      }
    });
    return () => {
      token.remove();
      foreground.remove();
      registration.cancel();
    };
  }, [available, subject, accountId, registration]);
  useEffect(() => {
    if (!ready) {
      return;
    }

    const receive = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });
    const tap = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        open(response);
      },
    );
    const initial = Notifications.getLastNotificationResponse();
    if (initial) {
      open(initial);
    }
    return () => {
      receive.remove();
      tap.remove();
    };
  }, [ready, subject]);
  return null;
}
