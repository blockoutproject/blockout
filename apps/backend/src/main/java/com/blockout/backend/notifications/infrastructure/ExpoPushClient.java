package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.PushProvider;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.niamedtech.expo.exposerversdk.exception.ErrorResponseException;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import com.niamedtech.expo.exposerversdk.response.ReceiptResponse.Receipt;
import com.niamedtech.expo.exposerversdk.response.TicketResponse.Ticket;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.NestedExceptionUtils;

/**
 * Thin mapping over Expo's listed Java SDK; native models/serialization/response handling stay
 * upstream.
 */
@Slf4j
@RequiredArgsConstructor
public class ExpoPushClient implements PushProvider {
  private final ExpoPushNotificationClient client;
  private final ExpoPushMapper mapper;

  /** {@inheritDoc} */
  @Override
  public List<Outcome> send(List<Message> messages) {
    if (messages.isEmpty() || messages.size() > 100)
      throw new IllegalArgumentException("Send batch limit");
    List<PushNotification> notifications = messages.stream().map(mapper::toDto).toList();
    try {
      List<Ticket> tickets = client.sendPushNotifications(notifications);
      List<Outcome> outcomes = new ArrayList<>();
      for (int i = 0; i < messages.size(); i++)
        outcomes.add(ticket(tickets != null && i < tickets.size() ? tickets.get(i) : null));
      report(outcomes, "ticket");
      return List.copyOf(outcomes);
    } catch (IOException failure) {
      List<Outcome> outcomes = java.util.Collections.nCopies(messages.size(), failed(failure));
      report(outcomes, "ticket");
      return outcomes;
    }
  }

  /** {@inheritDoc} */
  @Override
  public Map<String, Outcome> receipts(List<String> ids) {
    if (ids.isEmpty() || ids.size() > 1000)
      throw new IllegalArgumentException("Receipt batch limit");
    Map<String, Outcome> outcomes = new LinkedHashMap<>();
    try {
      Map<String, Receipt> receipts = client.getPushNotificationReceipts(ids);
      for (String id : ids) outcomes.put(id, receipt(receipts == null ? null : receipts.get(id)));
    } catch (IOException failure) {
      Outcome unavailable = failed(failure);
      for (String id : ids) outcomes.put(id, unavailable);
    }
    report(List.copyOf(outcomes.values()), "receipt");
    return Map.copyOf(outcomes);
  }

  /**
   * Maps one SDK ticket without asserting phone receipt or retaining raw provider details.
   *
   * @param ticket SDK value, absent when the response is incomplete
   * @return accepted ID, exact invalidation signal, ordinary rejection or uncertainty
   */
  private Outcome ticket(Ticket ticket) {
    if (ticket == null) return new Outcome(Status.UNKNOWN, null);
    if (ticket.getStatus() == com.niamedtech.expo.exposerversdk.response.Status.OK
        && ticket.getId() != null
        && !ticket.getId().isBlank()) return new Outcome(Status.ACCEPTED, ticket.getId());
    if (ticket.getStatus() == com.niamedtech.expo.exposerversdk.response.Status.ERROR) {
      Ticket.Details details = ticket.getDetails();
      if (details != null && details.getError() == Ticket.Error.INVALID_CREDENTIALS)
        configurationAlert();
      return new Outcome(
          details != null && details.getError() == Ticket.Error.DEVICE_NOT_REGISTERED
              ? Status.DEVICE_NOT_REGISTERED
              : Status.REJECTED,
          null);
    }
    return new Outcome(Status.UNKNOWN, null);
  }

  /**
   * Maps SDK receipt evidence; missing or undecodable evidence never causes a resend.
   *
   * @param receipt one SDK value, absent when Expo has no receipt
   * @return bounded evidence at the APNs/FCM boundary only
   */
  private Outcome receipt(Receipt receipt) {
    if (receipt == null) return new Outcome(Status.UNKNOWN, null);
    if (receipt.getStatus() == com.niamedtech.expo.exposerversdk.response.Status.OK)
      return new Outcome(Status.ACCEPTED, null);
    if (receipt.getStatus() == com.niamedtech.expo.exposerversdk.response.Status.ERROR) {
      Receipt.Details details = receipt.getDetails();
      if (details != null && details.getError() == Receipt.Details.Error.INVALID_CREDENTIALS)
        configurationAlert();
      return new Outcome(
          details != null && details.getError() == Receipt.Details.Error.DEVICE_NOT_REGISTERED
              ? Status.DEVICE_NOT_REGISTERED
              : Status.REJECTED,
          null);
    }
    return new Outcome(Status.UNKNOWN, null);
  }

  /**
   * Uses typed native failure causes only; SDK/provider messages are private and never
   * parsed/logged.
   *
   * @param failure SDK transport or decoding failure
   * @return native parsed refusal versus unavailable/uncertain evidence
   */
  private Outcome failed(IOException failure) {
    Throwable cause = NestedExceptionUtils.getMostSpecificCause(failure);
    return new Outcome(
        cause instanceof ErrorResponseException ? Status.REJECTED : Status.UNKNOWN, null);
  }

  /**
   * Exposes safe outcome counts only; neither SDK success nor a receipt proves phone receipt.
   *
   * @param outcomes bounded application evidence without raw SDK diagnostics
   * @param stage ticket or receipt boundary
   */
  private void report(List<Outcome> outcomes, String stage) {
    for (Status status : Status.values()) {
      long count = outcomes.stream().filter(value -> value.status() == status).count();
      if (count > 0)
        log.atInfo()
            .addKeyValue("operation", "expo_push_evidence")
            .addKeyValue("stage", stage)
            .addKeyValue("provider", "expo")
            .addKeyValue("outcome", status.name().toLowerCase(java.util.Locale.ROOT))
            .addKeyValue("affected_count", count)
            .log("Provider boundary evidence only");
    }
  }

  /** Reports a fixed category without raw SDK exceptions, bodies, addresses or ticket IDs. */
  private void configurationAlert() {
    log.atError()
        .addKeyValue("operation", "sporting_push_configuration")
        .addKeyValue("provider", "expo")
        .addKeyValue("outcome", "invalid")
        .addKeyValue("reason", "credentials_or_project")
        .log("Push credentials or project configuration require authorized manual correction");
  }
}
