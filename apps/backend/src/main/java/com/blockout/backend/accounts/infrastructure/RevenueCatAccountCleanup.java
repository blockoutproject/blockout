package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.blockout.backend.accounts.infrastructure.AccountCleanupProperties.Environment;
import lombok.RequiredArgsConstructor;
import org.springframework.web.client.RestClient;

/** Native bounded v2 DELETE; its 200 queues customer deletion and never cancels store billing. */
@RequiredArgsConstructor
public class RevenueCatAccountCleanup implements AccountCleanup.RevenueCat {
  private final RestClient client;
  private final AccountCleanupProperties properties;

  /** {@inheritDoc} */
  @Override
  public Outcome remove(String customerId) {
    if (properties.environment() == Environment.DISABLED
        || properties.revenueCatProjectId() == null
        || properties.revenueCatProjectId().isBlank()
        || properties.revenueCatSecretKey() == null
        || properties.revenueCatSecretKey().isBlank()) return Outcome.MISSING_CONFIGURATION;
    if (properties.environment() == Environment.PREPRODUCTION
        && !properties.preproductionRevenueCatIds().contains(customerId))
      return Outcome.UNSAFE_SCOPE;
    return client
        .delete()
        .uri(
            "/projects/{project}/customers/{customer}",
            properties.revenueCatProjectId(),
            customerId)
        .headers(headers -> headers.setBearerAuth(properties.revenueCatSecretKey()))
        .exchange(
            (request, response) -> {
              if (response.getStatusCode().value() == 200) return Outcome.QUEUED;
              if (response.getStatusCode().value() == 404) return Outcome.ABSENT;
              return Outcome.UNAVAILABLE_OR_UNCERTAIN;
            });
  }
}
