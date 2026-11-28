package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/** Native bounded v2 DELETE; its 200 queues customer deletion and never cancels store billing. */
@RequiredArgsConstructor
public class RevenueCatAccountCleanup implements AccountCleanup.RevenueCat {
  private final RestClient client;
  private final AccountCleanupProperties properties;

  /** {@inheritDoc} */
  @Override
  public Outcome remove(String customerId) {
    boolean hasProject = StringUtils.hasText(properties.revenueCatProjectId());
    boolean hasKey = StringUtils.hasText(properties.revenueCatSecretKey());
    if (!hasProject && !hasKey) {
      return Outcome.NOT_CONFIGURED;
    }
    if (!hasProject || !hasKey) {
      return Outcome.MISSING_CONFIGURATION;
    }
    return client
        .delete()
        .uri(
            "/projects/{project}/customers/{customer}",
            properties.revenueCatProjectId(),
            customerId)
        .headers(headers -> headers.setBearerAuth(properties.revenueCatSecretKey()))
        .exchange(
            (request, response) -> {
              if (response.getStatusCode().value() == 200) {
                return Outcome.QUEUED;
              }
              if (response.getStatusCode().value() == 404) {
                return Outcome.ABSENT;
              }
              return Outcome.UNAVAILABLE_OR_UNCERTAIN;
            });
  }
}
