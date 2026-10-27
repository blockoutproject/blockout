package com.blockout.collector.acquisition.application;

import java.net.URI;
import java.util.concurrent.CompletableFuture;
import org.springframework.core.task.TaskRejectedException;

/** Acquisition-owned page reading through one provider's existing shared transport budget. */
public interface ProviderPages {
  /**
   * Reads a complete source page with its final redirect context, without durable page caching.
   * Binary document bodies are refused before consumption; transport failures remain exceptional.
   *
   * @param uri published page URL within the provider's permitted origins
   * @return bounded complete content and provenance, or an exceptional future on acquisition
   *     failure
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws TaskRejectedException when shared capacity is full
   */
  CompletableFuture<ProviderResponse> page(URI uri);
}
