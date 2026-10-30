package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportCaseDraft;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportUnavailableException.Reason;
import com.blockout.backend.support.application.SupportUnavailableException.Stage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Fixed-repository REST intake; it neither searches old attempts nor rewrites attachment bodies.
 */
public final class GitHubSupportClient implements SupportCases {
  private final RestClient http;
  private final SupportProperties.Destination destination;
  private final String repositoryPath;

  /**
   * Adds server credentials and a native refusal handler without reading error response bodies.
   *
   * @param http bounded transport with a server-selected GitHub origin
   * @param destination fixed private destination, or null while support remains unconfigured
   */
  public GitHubSupportClient(RestClient http, SupportProperties.Destination destination) {
    this.destination = destination;
    this.repositoryPath = destination == null ? "" : "/repos/" + destination.repository();
    RestClient.Builder builder =
        http.mutate()
            .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2026-03-10")
            .defaultStatusHandler(
                status -> !status.is2xxSuccessful(),
                (request, response) -> {
                  throw new RestClientResponseException(
                      "Support provider refused request",
                      response.getStatusCode(),
                      "",
                      HttpHeaders.EMPTY,
                      new byte[0],
                      null);
                });
    if (destination != null)
      builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + destination.githubToken());
    this.http = builder.build();
  }

  /** {@inheritDoc} */
  @Override
  public long create(SupportCaseDraft draft) {
    requireDestination();
    try {
      IssueCreated issue =
          http.post()
              .uri(repositoryPath + "/issues")
              .body(
                  new CreateIssue(
                      draft.title(),
                      draft.body(),
                      List.of(
                          draft.complete()
                              ? destination.completeLabel()
                              : destination.incompleteLabel())))
              .retrieve()
              .body(IssueCreated.class);
      if (issue == null || issue.number() <= 0)
        throw new SupportUnavailableException(Stage.CREATE, Reason.UNCONFIRMED);
      return issue.number();
    } catch (RestClientException failure) {
      throw new SupportUnavailableException(Stage.CREATE, reason(failure), failure);
    }
  }

  /** {@inheritDoc} */
  @Override
  public void complete(long issueNumber) {
    requireDestination();
    try {
      http.post()
          .uri(repositoryPath + "/issues/{issue}/labels", issueNumber)
          .body(Map.of("labels", List.of(destination.completeLabel())))
          .retrieve()
          .toBodilessEntity();
      http.delete()
          .uri(
              repositoryPath + "/issues/{issue}/labels/{label}",
              issueNumber,
              destination.incompleteLabel())
          .retrieve()
          .toBodilessEntity();
    } catch (RestClientException failure) {
      if (reason(failure) == Reason.UNCONFIRMED && confirmsComplete(issueNumber)) return;
      throw new SupportUnavailableException(Stage.COMPLETE, reason(failure), failure);
    }
  }

  /**
   * Reads only this attempt's known case once after an ambiguous marking, without replaying writes.
   * Both intake labels mean incomplete; operator labels and open/closed state remain independent.
   *
   * @param issueNumber current known private case
   * @return whether the complete label exists and the incomplete label is absent
   */
  private boolean confirmsComplete(long issueNumber) {
    try {
      IssueLabels issue =
          http.get()
              .uri(repositoryPath + "/issues/{issue}", issueNumber)
              .retrieve()
              .body(IssueLabels.class);
      return issue != null
          && issue.labels() != null
          && issue.labels().stream()
              .anyMatch(label -> destination.completeLabel().equalsIgnoreCase(label.name()))
          && issue.labels().stream()
              .noneMatch(label -> destination.incompleteLabel().equalsIgnoreCase(label.name()));
    } catch (RestClientException failure) {
      return false;
    }
  }

  /**
   * Refuses unconfigured support before any provider effect, while ordinary application startup
   * remains usable.
   */
  private void requireDestination() {
    if (destination == null)
      throw new SupportUnavailableException(Stage.CONFIGURATION, Reason.UNCONFIGURED);
  }

  /**
   * Treats transport/5xx failures as ambiguous and definitive HTTP refusals as failed intake.
   *
   * @param failure native HTTP failure; its body, URL and message are never diagnostics
   * @return safe bounded reason for this request
   */
  private static Reason reason(RestClientException failure) {
    return failure instanceof RestClientResponseException response
            && !response.getStatusCode().is5xxServerError()
        ? Reason.REFUSED
        : Reason.UNCONFIRMED;
  }

  /** Private REST creation payload, not a mobile transport model. */
  private record CreateIssue(String title, String body, List<String> labels) {}

  /** Only the newly created issue number is needed; provider URLs and content remain unused. */
  @JsonIgnoreProperties(ignoreUnknown = true)
  private record IssueCreated(long number) {}

  /** Narrow current marking observation, used only during this same request. */
  @JsonIgnoreProperties(ignoreUnknown = true)
  private record IssueLabels(List<Label> labels) {}

  /** Provider label spelling; GitHub label identity is case insensitive. */
  @JsonIgnoreProperties(ignoreUnknown = true)
  private record Label(String name) {}
}
