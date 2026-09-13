package com.blockout.backend.identity.subscription.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Verifies elapsed-time boundaries without wall-clock sleeps or provider fixtures. */
class SubscriptionPolicyTest {
  private static final Instant VERIFIED = Instant.parse("2026-09-13T10:00:00Z");

  @Test
  void positiveEvidenceExpiresAtTenMinutesWithoutAnOutage() {
    SubscriptionEvidence proof = new SubscriptionEvidence(true, VERIFIED, null, null);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(599)).state())
        .isEqualTo(SubscriptionState.ACTIVE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(600)).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
  }

  @Test
  void outageGraceNeverAdvancesVerificationTime() {
    SubscriptionEvidence proof =
        new SubscriptionEvidence(true, VERIFIED, null, SubscriptionFailure.UNAVAILABLE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(600)).state())
        .isEqualTo(SubscriptionState.GRACE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(86400)).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
  }

  @Test
  void reliableAccessExpiryShortensGrace() {
    SubscriptionEvidence proof =
        new SubscriptionEvidence(
            true, VERIFIED, VERIFIED.plusSeconds(900), SubscriptionFailure.UNAVAILABLE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(899)).usableUntil())
        .isEqualTo(VERIFIED.plusSeconds(900));
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(900)).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
  }

  @Test
  void negativeEvidenceBecomesUnknownWhenStale() {
    SubscriptionEvidence proof =
        new SubscriptionEvidence(false, VERIFIED, null, SubscriptionFailure.UNAVAILABLE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED).state())
        .isEqualTo(SubscriptionState.INACTIVE);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(600)).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
  }

  @Test
  void configurationFailuresNeverCreateOutageGrace() {
    SubscriptionEvidence proof =
        new SubscriptionEvidence(true, VERIFIED, null, SubscriptionFailure.CONFIGURATION);
    assertThat(SubscriptionPolicy.evaluate(proof, VERIFIED.plusSeconds(600)).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
    assertThat(SubscriptionPolicy.evaluate(null, VERIFIED).state())
        .isEqualTo(SubscriptionState.UNKNOWN);
  }
}
