package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.PushProvider;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Focused official Expo HTTP adapter; provider schemas stay here, without retry or payload logs.
 */
@Slf4j
@RequiredArgsConstructor
public class ExpoPushClient implements PushProvider {
  private final RestClient client;
  private final JsonMapper json;

  /** {@inheritDoc} */
  @Override
  public List<Outcome> send(List<Message> messages) {
    if (messages.isEmpty() || messages.size() > 100)
      throw new IllegalArgumentException("Send batch limit");
    List<Map<String, Object>> payloads = new ArrayList<>();
    for (Message message : messages) {
      Map<String, Object> payload =
          Map.of(
              "to",
              message.target().address(),
              "title",
              message.text().title(),
              "body",
              message.text().body(),
              "data",
              Map.of(
                  "ownerAccountId",
                  message.ownerAccountId(),
                  "notificationId",
                  message.notificationId(),
                  "matchId",
                  message.matchId()));
      if (json.writeValueAsBytes(payload).length > 4096)
        throw new IllegalArgumentException("Payload limit");
      payloads.add(payload);
    }
    JsonNode response = post("/send", payloads);
    JsonNode data = response.path("data");
    List<Outcome> outcomes = new ArrayList<>();
    for (int i = 0; i < messages.size(); i++)
      outcomes.add(
          response.path("requestRejected").asBoolean(false)
              ? new Outcome(Status.REJECTED, null)
              : outcome(data.path(i), true));
    report(outcomes, "ticket");
    return List.copyOf(outcomes);
  }

  /** {@inheritDoc} */
  @Override
  public Map<String, Outcome> receipts(List<String> ids) {
    if (ids.isEmpty() || ids.size() > 1000)
      throw new IllegalArgumentException("Receipt batch limit");
    JsonNode response = post("/getReceipts", Map.of("ids", ids));
    JsonNode data = response.path("data");
    Map<String, Outcome> outcomes = new LinkedHashMap<>();
    for (String id : ids)
      outcomes.put(
          id,
          response.path("requestRejected").asBoolean(false)
              ? new Outcome(Status.REJECTED, null)
              : outcome(data.path(id), false));
    report(List.copyOf(outcomes.values()), "receipt");
    return Map.copyOf(outcomes);
  }

  /**
   * Performs one bounded HTTP attempt, distinguishing explicit refusal from uncertain transport.
   *
   * @param path provider-owned relative send/receipt operation
   * @param payload bounded ephemeral message/ID payload
   * @return provider evidence, a local refusal marker, or an empty object for uncertainty
   */
  private JsonNode post(String path, Object payload) {
    try {
      JsonNode response =
          client
              .post()
              .uri(path)
              .contentType(MediaType.APPLICATION_JSON)
              .body(payload)
              .retrieve()
              .body(JsonNode.class);
      if (response == null) return json.createObjectNode();
      boolean configurationError =
          response.findValues("error").stream()
              .map(value -> value.asString(""))
              .anyMatch(
                  value -> value.equals("InvalidCredentials") || value.equals("MismatchSenderId"));
      if (configurationError) configurationAlert();
      if (response.path("errors").isArray() && !response.path("errors").isEmpty()) {
        boolean unauthorized =
            response
                .path("errors")
                .valueStream()
                .anyMatch(
                    error ->
                        error.path("code").asString("").equals("UNAUTHORIZED")
                            || error
                                .path("code")
                                .asString("")
                                .equals("PUSH_TOO_MANY_EXPERIENCE_IDS"));
        if (unauthorized) configurationAlert();
        return json.createObjectNode().put("requestRejected", true);
      }
      return response;
    } catch (RestClientResponseException refusal) {
      if (refusal.getStatusCode().value() == 401 || refusal.getStatusCode().value() == 403)
        configurationAlert();
      return json.createObjectNode().put("requestRejected", true);
    } catch (RestClientException uncertain) {
      return json.createObjectNode();
    }
  }

  /**
   * Maps extensible provider evidence; malformed/missing status or ticket ID remains uncertain.
   *
   * @param node one provider ticket/receipt
   * @param ticket whether an accepted result must include a ticket ID
   * @return bounded local outcome without retaining provider messages or details
   */
  private Outcome outcome(JsonNode node, boolean ticket) {
    String status = node.path("status").asString("");
    String id = node.path("id").asString("");
    if (status.equals("ok") && (!ticket || !id.isBlank()))
      return new Outcome(Status.ACCEPTED, ticket ? id : null);
    if (status.equals("error"))
      return new Outcome(
          node.path("details").path("error").asString("").equals("DeviceNotRegistered")
              ? Status.DEVICE_NOT_REGISTERED
              : Status.REJECTED,
          null);
    return new Outcome(Status.UNKNOWN, null);
  }

  /**
   * Exposes diagnostic acceptance/rejection/uncertainty counts only; acceptance is never receipt.
   *
   * @param outcomes bounded local evidence, containing no raw provider error messages
   * @param stage ticket acceptance or APNs/FCM receipt evidence
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

  /**
   * Reports a fixed category for credential/project repair without exposing provider diagnostics.
   */
  private void configurationAlert() {
    log.atError()
        .addKeyValue("operation", "sporting_push_configuration")
        .addKeyValue("provider", "expo")
        .addKeyValue("outcome", "invalid")
        .addKeyValue("reason", "credentials_or_project")
        .log("Push credentials or project configuration require authorized manual correction");
  }
}
