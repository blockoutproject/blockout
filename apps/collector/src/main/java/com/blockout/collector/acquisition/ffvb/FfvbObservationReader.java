package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.AcquisitionFailure;
import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.ProviderObservation;
import com.blockout.collector.acquisition.application.ProviderReadAttempt;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.jsoup.nodes.Document;
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
    ProviderResponse response;
    try {
      response = http.page(url);
    } catch (RuntimeException failure) {
      throw readFailure(failure);
    }
    Instant observedAt = clock.instant();
    return fromPage(FfvbPage.document(response.body(), response.url()), response.url(), observedAt);
  }

  /** {@inheritDoc} */
  @Override
  public Resource fromPage(Document document, URI url, Instant observedAt) {
    return new SharedResource(
        observedAt, ProviderReadAttempt.capture(() -> new FfvbPage.Publication(url, document)));
  }

  /**
   * Retains decoded publications for one resource. Export failure is shared across calendar scopes
   * while standings remain independently readable from HTML.
   */
  @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
  private final class SharedResource implements Resource {
    private final Instant htmlObservedAt;
    private final ProviderReadAttempt<FfvbPage.Publication> html;
    private ProviderReadAttempt<ProviderObservation<FfvbCalendarParser.Export>> export;

    /** {@inheritDoc} */
    @Override
    public ProviderObservation<SportingObservation.Calendar> calendar(
        CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.value(), scope(target));
      if (export == null) {
        export = ProviderReadAttempt.capture(() -> readExport(page));
      }
      ProviderObservation<FfvbCalendarParser.Export> csv = export.value();
      return new ProviderObservation<>(calendars.parse(csv.observation(), page), csv.observedAt());
    }

    /** {@inheritDoc} */
    @Override
    public ProviderObservation<SportingObservation.Standings> standings(
        CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.value(), scope(target));
      return new ProviderObservation<>(standings.parse(page), htmlObservedAt);
    }
  }

  private ProviderObservation<FfvbCalendarParser.Export> readExport(FfvbPage page) {
    byte[] body;
    try {
      body = http.post(page.exportUrl(), page.exportFields(), StandardCharsets.UTF_8);
    } catch (RuntimeException failure) {
      throw readFailure(failure);
    }
    Instant observedAt = clock.instant();
    return new ProviderObservation<>(calendars.decode(body, page), observedAt);
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
