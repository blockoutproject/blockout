package com.blockout.backend.contributions.application;

import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import lombok.Getter;

/** Safe typed policy refusal; excludes submitted addresses and private state. */
@Getter
public class ContributionRejectedException extends RuntimeException {
  private final Status status;

  /**
   * @param status concrete current policy refusal
   */
  public ContributionRejectedException(Status status) {
    super("Contribution is not permitted");
    this.status = status;
  }
}
