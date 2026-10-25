package com.blockout.backend.search.application;

/** Safe bulk outcome counts; native error payloads never cross into operational diagnostics. */
@lombok.Getter
public class SearchProjectionBulkException extends SearchUnavailableException {
  private final int attempted;
  private final int succeeded;

  /**
   * Retains only bounded counts from an incomplete native bulk response.
   *
   * @param attempted number of submitted items
   * @param succeeded number of explicitly successful returned items
   */
  public SearchProjectionBulkException(int attempted, int succeeded) {
    this.attempted = attempted;
    this.succeeded = succeeded;
  }
}
