package com.blockout.collector.acquisition.application;

import java.time.LocalDate;
import org.openapitools.jackson.nullable.JsonNullable;

/** Synthetic FFVB encounters shared by collector-to-sporting qualification tests. */
final class SportingObservationFixture {
  /** Prevents instantiation of the shared sporting data factory. */
  private SportingObservationFixture() {}

  /**
   * Creates an FFVB encounter between the shared synthetic Home and Away clubs.
   *
   * @param reference scenario-owned contextual native match identity
   * @param date proposed date, including an explicit null withdrawal
   * @return encounter with exact leading-zero club references and no other optional facts
   */
  static SportingObservation.Match ffvbMatch(String reference, LocalDate date) {
    return new SportingObservation.Match(
        reference,
        new SportingObservation.Team("Home", null, "000192", null),
        new SportingObservation.Team("Away", null, "000193", null),
        SportingObservation.Facts.builder().localDate(JsonNullable.of(date)).build(),
        null);
  }
}
