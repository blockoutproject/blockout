package com.blockout.collector.acquisition.application;

import java.io.UncheckedIOException;
import java.net.URI;

/** Acquisition-owned page reading through one provider's existing shared transport budget. */
public interface ProviderPages {
  /**
   * Reads a complete source page with its final redirect context, without durable page caching.
   * Responses declared as PDF or octet-stream are refused before body consumption; transport
   * failures remain exceptional.
   *
   * @param uri published page URL within the provider's permitted origins
   * @return bounded complete content and provenance
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws UncheckedIOException for transport, status, timeout or complete-body failure
   * @throws RuntimeException when the finite shared permit budget cannot be obtained
   */
  ProviderResponse page(URI uri);
}
