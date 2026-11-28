package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationMessage;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Best-effort transport only; no persistence, retry or assertion of phone receipt. */
public interface PushProvider {
  /**
   * Attempts one same-project batch, without retrying uncertain outcomes.
   *
   * @param messages at most 100 current safe messages, each at most 4 KiB
   * @return one outcome per message, in request order
   */
  List<Outcome> send(List<Message> messages);

  /**
   * Observes available receipts once; missing evidence stays unknown.
   *
   * @param ids at most 1,000 in-memory ticket IDs
   * @return outcome for every requested ID; no result asserts phone receipt
   */
  Map<String, Outcome> receipts(List<String> ids);

  /** Safe current sporting text with only navigation identities and a private transport target. */
  record Message(
      PushSubscriptionStore.Target target,
      UUID ownerAccountId,
      UUID notificationId,
      UUID matchId,
      NotificationMessage text) {}

  /** Local transport vocabulary; accepted means provider acceptance only. */
  enum Status {
    ACCEPTED,
    REJECTED,
    DEVICE_NOT_REGISTERED,
    UNKNOWN
  }

  /** Transient provider evidence; only accepted send tickets carry an observation ID. */
  record Outcome(Status status, String ticketId) {}
}
