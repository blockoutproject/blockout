package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Independent bounded original-target attempts after local commit, with private manual evidence.
 */
@Slf4j
@RequiredArgsConstructor
public class OriginalTargetCleanup {
  private final AccountCleanup.Auth0 auth0;
  private final AccountCleanup.RevenueCat revenueCat;
  private final String environment;

  /**
   * Attempts each known original target once; an exception never suppresses another target. No SQL,
   * current-account resolution, polling or retry occurs here.
   *
   * @param targets immutable references captured for the deleted lifecycle
   */
  public void clean(OriginalAccountTargets targets) {
    if (targets.subject() == null || targets.subject().isBlank()) {
      diagnostic(targets, "auth0", null, Outcome.MISSING_TARGET);
    } else {
      Outcome result = attempt(() -> auth0.remove(targets.issuer(), targets.subject()));
      if (result.needsAttention()) diagnostic(targets, "auth0", targets.subject(), result);
    }
    if (targets.revenueCatIds().isEmpty())
      diagnostic(targets, "revenuecat", null, Outcome.MISSING_TARGET);
    for (String target : new LinkedHashSet<>(targets.revenueCatIds())) {
      Outcome result =
          target.isBlank() ? Outcome.MISSING_TARGET : attempt(() -> revenueCat.remove(target));
      if (result.needsAttention()) diagnostic(targets, "revenuecat", target, result);
    }
  }

  /**
   * Converts only the operational category; private provider exception text never enters logs.
   *
   * @param call one bounded provider operation
   * @return acknowledgment or safe uncertainty
   */
  private Outcome attempt(Supplier<Outcome> call) {
    try {
      return call.get();
    } catch (RuntimeException failure) {
      return Outcome.UNAVAILABLE_OR_UNCERTAIN;
    }
  }

  /**
   * Emits the F05/F11 private reference exception through existing structured logging only.
   *
   * @param targets original lifecycle references without profile/credential content
   * @param provider fixed provider family
   * @param target original provider reference, absent when unknown
   * @param outcome safe finite failure category
   */
  private void diagnostic(
      OriginalAccountTargets targets, String provider, String target, Outcome outcome) {
    Map<String, String> reference = new java.util.LinkedHashMap<>();
    reference.put("original_account_id", targets.accountId().toString());
    if (target != null)
      reference.put(provider.equals("auth0") ? "auth0_subject" : "revenuecat_app_user_id", target);
    log.atWarn()
        .addKeyValue("operation", "account_cleanup")
        .addKeyValue("scope", environment)
        .addKeyValue("provider", provider)
        .addKeyValue("outcome", "manual_attention")
        .addKeyValue("reason", outcome.name().toLowerCase(java.util.Locale.ROOT))
        .addKeyValue("account_cleanup", Map.copyOf(reference))
        .log("Original account provider cleanup needs private manual handling");
  }
}
