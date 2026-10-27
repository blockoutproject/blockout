package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.LnvAcquisition.Read;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.time.Clock;
import java.util.concurrent.CompletionException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Component;

/** Reads published logos with the shared LNV budget and native bounded in-memory cache. */
@Component
public class LnvTeamImages {
  private final ProviderHttpClient http;
  private final Clock clock;

  /**
   * Binds the existing provider budget; no independent image scheduler is introduced.
   *
   * @param http shared LNV HTTP and image cache
   * @param clock actual source-read completion time
   */
  public LnvTeamImages(@Qualifier("lnvProviderClient") ProviderHttpClient http, Clock clock) {
    this.http = http;
    this.clock = clock;
  }

  /**
   * Returns bytes only for a new supplier response; the passage deduplicates native team IDs.
   *
   * @param uri qualified published image reference
   * @return new observation timestamped after the supplier read, or null on native cache reuse
   * @throws IllegalArgumentException when the source URL is outside the configured origins
   * @throws TaskRejectedException when the shared provider capacity is full
   * @throws CompletionException when the asynchronous image acquisition fails
   */
  public Read<byte[]> read(URI uri) {
    ProviderResponse response = http.image(uri).join();
    return response.supplierRead() ? new Read<>(response.body(), clock.instant()) : null;
  }
}
