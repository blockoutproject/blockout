import { randomUUID } from "expo-crypto";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import {
  deletePushSubscription,
  replacePushSubscription,
} from "../../../../.generated/mobile";
import { PushSubscriptionResponse } from "../../../../.generated/schemas/index.zod";
import type { InboxOwner, InboxRequest } from "../api/inbox-queries";
import { readPushInstallation } from "./installation-identity";

/** The sole installation registration owner; contains no inbox, session authority or persisted credentials. */
export type PushRegistration = ReturnType<typeof createPushRegistration>;

/** Owns one sign-in association and controllable SDK/HTTP work; failures wait for the next ordinary occasion. */
export function createPushRegistration() {
  let connection:
    | {
        owner: InboxOwner & {
          accountId: string;
        };
        id: string;
        putDispatched: boolean;
        credentials: () => Promise<
          | {
              accessToken: string;
            }
          | undefined
        >;
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

  function takeConnection() {
    const original = connection;
    cancel();
    connection = undefined;
    return original;
  }

  return {
    cancel,
    /** Discards in-memory association/work on external invalidation; explicit departures capture removal first. */
    reset(owner: Pick<InboxOwner, "subject" | "accountId">) {
      if (
        connection &&
        (connection.owner.subject !== owner.subject ||
          connection.owner.accountId !== owner.accountId)
      ) {
        takeConnection();
      }
    },
    /** Obtains an Expo address after capturing authority; a native APNs/FCM listener supplies only an occasion. */
    async register(
      owner: InboxOwner,
      projectId: string,
      request: InboxRequest,
      credentials: () => Promise<
        | {
            accessToken: string;
          }
        | undefined
      >,
      devicePushToken?: Notifications.DevicePushToken,
    ) {
      if (!owner.accountId) {
        return;
      }
      if (
        connection?.owner.subject !== owner.subject ||
        connection.owner.accountId !== owner.accountId
      ) {
        connection = {
          owner: { ...owner, accountId: owner.accountId },
          id: randomUUID(),
          putDispatched: false,
          credentials,
        };
      }
      const original = connection;
      cancel();
      const controller = new AbortController();
      currentRequest = controller;
      /** Rechecks the original command after every native wait, independently of transport cancellation. */
      const current = () =>
        !controller.signal.aborted && connection === original;
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Notifications",
            importance: AndroidImportance.DEFAULT,
          });
        }
        if (!current()) {
          return;
        }
        let permission = await Notifications.getPermissionsAsync();
        if (!current()) {
          return;
        }
        if (!permission.granted && permission.canAskAgain) {
          permission = await Notifications.requestPermissionsAsync();
          if (!current()) {
            return;
          }
        }
        if (!permission.granted) {
          return;
        }
        installation ??= readPushInstallation().catch((error: unknown) => {
          installation = undefined;
          throw error;
        });
        const installationId = await installation;
        if (!current()) {
          return;
        }
        // Reusing the listener's native token avoids getDevicePushTokenAsync re-emitting that listener.
        const token = await Notifications.getExpoPushTokenAsync(
          devicePushToken ? { projectId, devicePushToken } : { projectId },
        );
        if (!current()) {
          return;
        }
        const options = await request(controller.signal);
        if (!current()) {
          return;
        }
        await replacePushSubscription(
          owner.accountId,
          original.id,
          { installationId, expoPushToken: token.data },
          {
            ...options,
            signal: options.signal ?? controller.signal,
            schema: PushSubscriptionResponse,
            onDispatch() {
              original.putDispatched = true;
            },
          },
        );
      } catch {
        // Best effort only: no replay, provider payload logging or new unavailable-account state.
      }
    },
    /** Account erasure owns remote deletion. Retire only the erased account's local connection. */
    abandon(accountId: string) {
      if (connection?.owner.accountId === accountId) {
        takeConnection();
      }
    },
    /** Captures the old association before waiting and bounds all cleanup I/O to three seconds. */
    async remove(): Promise<void> {
      const original = takeConnection();
      if (!original?.putDispatched) {
        return;
      }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve();
        }, 3000);
      });
      /** Credentials remain SDK-owned and are never retained solely to retry cleanup. */
      const deleteOriginal = async () => {
        const credentials = await original.credentials();
        if (!credentials || controller.signal.aborted) {
          return;
        }
        await deletePushSubscription(original.owner.accountId, original.id, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      };
      try {
        await Promise.race([deleteOriginal().catch(() => undefined), deadline]);
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
    },
  };
}
