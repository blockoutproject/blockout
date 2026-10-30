package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportUnavailableException.Reason;
import com.blockout.backend.support.application.SupportUnavailableException.Stage;
import java.net.URI;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;

/** One generic private webhook attempt; no submitted value can cross this boundary. */
@RequiredArgsConstructor
public final class DiscordSupportSignal implements SupportSignal {
  private final RestClient http;
  private final SupportProperties.Destination destination;
  private final SupportDiagnostics diagnostics;

  /** {@inheritDoc} */
  @Override
  public void accepted() {
    try {
      if (destination == null)
        throw new SupportUnavailableException(Stage.SIGNAL, Reason.UNCONFIGURED);
      String content =
          "A support request has been received. https://github.com/"
              + destination.repository()
              + "/issues";
      if (http.post()
              .uri(URI.create(destination.discordWebhook() + "?wait=true"))
              .body(Map.of("content", content))
              .retrieve()
              .toBodilessEntity()
              .getStatusCode()
          != HttpStatus.OK) {
        throw new SupportUnavailableException(Stage.SIGNAL, Reason.UNCONFIRMED);
      }
    } catch (RuntimeException failure) {
      diagnostics.failure(
          new SupportUnavailableException(Stage.SIGNAL, Reason.UNCONFIRMED, failure));
    }
  }
}
