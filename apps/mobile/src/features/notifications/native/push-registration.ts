import { randomUUID } from "expo-crypto";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import {
  deletePushSubscription,
  replacePushSubscription,
} from "../../../../.generated/mobile";
import { PushSubscriptionResponse } from "../../../../.generated/schemas/index.zod";
import type { AccountCredentialCleanup } from "../../accounts";
import type { InboxOwner, InboxRequest } from "../api/inbox-queries";
import { readPushInstallation } from "./installation-identity";
import { clearNotificationBadge } from "./notification-badge";

/** The sole installation registration owner; contains no inbox, session authority or persisted credentials. */
export type PushRegistration = ReturnType<typeof createPushRegistration>;

/** Owns one sign-in association and controllable SDK/HTTP work; failures wait for the next ordinary occasion. */
export function createPushRegistration() {
  let connection:
    | {
        owner: InboxOwner & { accountId: string };
        id: string;
        credentials: () => Promise<{ accessToken: string } | undefined>;
      }
    | undefined;
  let currentRequest: AbortController | undefined;
  // One storage read/write per process owner also prevents competing first-registration UUID creation.
  let installation: Promise<string> | undefined;

  /** Stops obsolete work without claiming that an already transmitted PUT can be recalled. */
  function cancel() {
    currentRequest?.abort();
    currentRequest = undefined;
  }

  return {
    cancel,
    /** Discards in-memory association/work on external invalidation; explicit departures capture removal first. */
    reset(owner: Pick<InboxOwner, "generation" | "accountId">) {
      clearNotificationBadge();
      if (
        connection &&
        (connection.owner.generation !== owner.generation ||
          connection.owner.accountId !== owner.accountId)
      ) {
        cancel();
        connection = undefined;
      }
    },

    /** Obtains an Expo address after capturing authority; a native APNs/FCM listener supplies only an occasion. */
    async register(
      owner: InboxOwner,
      projectId: string,
      request: InboxRequest,
      credentials: () => Promise<{ accessToken: string } | undefined>,
      devicePushToken?: Notifications.DevicePushToken,
    ) {
      if (!owner.accountId || !owner.isCurrent(owner.generation)) return;
      if (
        connection?.owner.generation !== owner.generation ||
        connection.owner.accountId !== owner.accountId
      ) {
        connection = {
          owner: { ...owner, accountId: owner.accountId },
          id: randomUUID(),
          credentials,
        };
      }
      const original = connection;
      cancel();
      const controller = new AbortController();
      currentRequest = controller;
      /** Rechecks the original command after every native wait, independently of transport cancellation. */
      const current = () =>
        !controller.signal.aborted &&
        owner.isCurrent(owner.generation) &&
        connection === original;
      try {
        if (Platform.OS === "android")
          await Notifications.setNotificationChannelAsync("default", {
            name: "Notifications",
            importance: AndroidImportance.DEFAULT,
          });
        if (!current()) return;
        let permission = await Notifications.getPermissionsAsync();
        if (!current()) return;
        if (!permission.granted && permission.canAskAgain) {
          permission = await Notifications.requestPermissionsAsync();
          if (!current()) return;
        }
        if (!permission.granted) return;
        installation ??= readPushInstallation().catch((error: unknown) => {
          installation = undefined;
          throw error;
        });
        const installationId = await installation;
        if (!current()) return;
        // Reusing the listener's native token avoids getDevicePushTokenAsync re-emitting that listener.
        const token = await Notifications.getExpoPushTokenAsync(
          devicePushToken ? { projectId, devicePushToken } : { projectId },
        );
        if (!current()) return;
        const options = await request(controller.signal);
        if (!current()) return;
        await replacePushSubscription(
          owner.accountId,
          original.id,
          { installationId, expoPushToken: token.data },
          {
            ...options,
            signal: options.signal ?? controller.signal,
            session: owner,
            schema: PushSubscriptionResponse,
          },
        );
      } catch {
        // Best effort only: no replay, provider payload logging or new unavailable-account state.
      }
    },

    /** Captures one exact old resource synchronously, clears memory/badge and bounds all cleanup I/O to three seconds. */
    prepareRemoval(): AccountCredentialCleanup | undefined {
      cancel();
      const original = connection;
      connection = undefined;
      clearNotificationBadge();
      if (!original) return;
      return async (session) => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve();
          }, 3_000);
        });
        /** Credentials remain SDK-owned and are never retained solely to retry cleanup. */
        const remove = async () => {
          const credentials = await original.credentials();
          if (
            !credentials ||
            controller.signal.aborted ||
            !session.isCurrent(session.generation)
          )
            return;
          await deletePushSubscription(original.owner.accountId, original.id, {
            session,
            signal: controller.signal,
            timeoutMs: 3_000,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
        };
        try {
          await Promise.race([remove().catch(() => undefined), deadline]);
        } finally {
          clearTimeout(timer);
          controller.abort();
        }
      };
    },
  };
}
