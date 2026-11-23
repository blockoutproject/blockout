package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.AcquisitionFailure;
import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.ProviderReadAttempt;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Uses the shared bounded HTTP client; jsoup never performs a separate network request. */
@Component
public class FfvbObservationReader implements FfvbAcquisition {
  private final ProviderHttpClient http;
  private final FfvbCalendarParser calendars;
  private final FfvbStandingsParser standings;
  private final Clock clock;

  /**
   * Binds the FFVB budget and its two independent interpreters.
   *
   * @param http explicit FFVB transport
   * @param calendars CSV interpreter
   * @param standings official table interpreter
   * @param clock actual provider read completion times
   */
  public FfvbObservationReader(
      @Qualifier("ffvbProviderClient") ProviderHttpClient http,
      FfvbCalendarParser calendars,
      FfvbStandingsParser standings,
      Clock clock) {
    this.http = http;
    this.calendars = calendars;
    this.standings = standings;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public URI resourceUrl(CollectionBackend.Target target) {
    try {
      return FfvbPage.completeCalendarUrl(target.url());
    } catch (URISyntaxException invalid) {
      throw new FfvbAcquisitionException("Invalid FFVB acquisition URL");
    }
  }

  /** {@inheritDoc} */
  @Override
  public Resource read(URI url) {
    try {
      ProviderResponse response = http.page(url);
      return fromPage(response, clock.instant());
    } catch (RuntimeException failure) {
      throw readFailure(failure);
    }
  }

  /** {@inheritDoc} */
  @Override
  public Resource fromPage(ProviderResponse page, Instant observedAt) {
    return new SharedResource(page.url(), new Read<>(page.body(), observedAt));
  }

  /**
   * Keeps at most one bounded HTML body and export for the current resource. Export failure is
   * retained for its other calendar scopes without preventing independent standings interpretation.
   */
  @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
  private final class SharedResource implements Resource {
    private final URI url;
    private final Read<byte[]> html;
    private ProviderReadAttempt<Read<byte[]>> export;

    /** {@inheritDoc} */
    @Override
    public Read<SportingObservation.Calendar> calendar(CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.observation(), url, scope(target));
      if (export == null) {
        export = ProviderReadAttempt.capture(() -> readExport(page));
      }
      Read<byte[]> csv = export.value();
      return new Read<>(calendars.parse(csv.observation(), page, scope(target)), csv.observedAt());
    }

    /** {@inheritDoc} */
    @Override
    public Read<SportingObservation.Standings> standings(CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.observation(), url, scope(target));
      return new Read<>(standings.parse(page), html.observedAt());
    }
  }

  private Read<byte[]> readExport(FfvbPage page) {
    try {
      byte[] body = http.post(page.exportUrl(), page.exportFields());
      return new Read<>(body, clock.instant());
    } catch (RuntimeException failure) {
      throw readFailure(failure);
    }
  }

  /**
   * Translates synchronous native HTTP errors without exposing response content or URLs.
   *
   * @param failure failed provider read
   * @return safe status/type diagnostic retaining the internal cause
   */
  private FfvbAcquisitionException readFailure(RuntimeException failure) {
    return new FfvbAcquisitionException(
        AcquisitionFailure.reason(failure), failure, FfvbAcquisitionException.Kind.TRANSPORT);
  }

  /**
   * Projects the backend-qualified native identity without guessing group membership.
   *
   * @param target backend-qualified context
   * @return exact native scope without inferred grouping
   */
  private FfvbScope scope(CollectionBackend.Target target) {
    return new FfvbScope(
        target.seasonLabel(),
        target.organizerReference(),
        target.competitionReference(),
        target.poolReference(),
        target.tourReference(),
        target.groupReference());
  }
}
