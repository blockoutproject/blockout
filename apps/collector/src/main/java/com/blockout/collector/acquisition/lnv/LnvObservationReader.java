package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.LongSupplier;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Explicit LNV native parsers over the shared bounded transport; no sporting fallback. */
@Component
public class LnvObservationReader implements LnvAcquisition {
  private final ProviderHttpClient http;
  private final LnvCalendarParser calendars;
  private final LnvStandingsParser standings;
  private final LnvDetailParser details;
  private final LnvDocumentReferences documents;
  private final AcquisitionProperties properties;
  private final Clock clock;

  /**
   * Composes independent source interpreters without another runtime or persistence boundary.
   *
   * @param http shared LNV transport
   * @param calendars grouped calendars
   * @param standings official tables
   * @param details match details
   * @param documents published document forms and references
   * @param properties explicitly verified document-label associations
   * @param clock source completion times
   */
  public LnvObservationReader(
      @Qualifier("lnvProviderClient") ProviderHttpClient http,
      LnvCalendarParser calendars,
      LnvStandingsParser standings,
      LnvDetailParser details,
      LnvDocumentReferences documents,
      AcquisitionProperties properties,
      Clock clock) {
    this.http = http;
    this.calendars = calendars;
    this.standings = standings;
    this.details = details;
    this.documents = documents;
    this.properties = properties;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public Resource read(URI uri) {
    ProviderResponse response = http.page(uri).join();
    return fromPage(response, clock.instant());
  }

  /** {@inheritDoc} */
  @Override
  public Resource fromPage(ProviderResponse response, Instant observedAt) {
    return new Resource() {
      /** {@inheritDoc} */
      @Override
      public Calendar calendar(CollectionBackend.Target target) {
        requireSeason(response, target);
        LnvCalendarParser.Read read =
            calendars.parse(
                response.body(),
                response.url(),
                target.competitionReference(),
                target.poolReference(),
                target.groupReference());
        return new Calendar(
            read.calendar(),
            read.logos(),
            observedAt,
            documents.competitionCode(read.groupTitle()));
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Standings> standings(CollectionBackend.Target target) {
        requireSeason(response, target);
        Map<String, String> fields = LnvPage.query(response.url());
        if (!target.competitionReference().equals(fields.get("ID"))
            || fields.containsKey("PID") && !target.poolReference().equals(fields.get("PID")))
          throw LnvPage.invalid();
        return new Read<>(
            standings.parse(response.body(), response.url(), target.groupReference()), observedAt);
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Facts> detail(CollectionBackend.Target target) {
        requireSeason(response, target);
        requireMatch(response.url(), target);
        LnvDetailParser.Read read =
            details.inspect(
                response.body(),
                response.url(),
                target.nativeMatchReference(),
                target.competitionReference());
        return new Read<>(read.facts(), observedAt, read.complete());
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Facts> document(
          CollectionBackend.Target target, String label) {
        requireSeason(response, target);
        requireMatch(response.url(), target);
        LnvDocumentReferences.Form form = documents.form(response.body(), response.url(), label);
        if (form == null) return null;
        requireMatch(form.action(), target);
        ProviderResponse document = http.postPage(form.action(), form.fields()).join();
        requireMatch(document.url(), target);
        requireSeason(document, target);
        URI pdf = documents.publishedPdf(document.body(), document.url());
        if (pdf == null) throw LnvPage.invalid();
        SportingObservation.Facts facts =
            label.equals("Scoresheet")
                ? SportingObservation.Facts.builder().scoresheetUrl(JsonNullable.of(pdf)).build()
                : SportingObservation.Facts.builder().statisticsUrl(JsonNullable.of(pdf)).build();
        return new Read<>(facts, clock.instant());
      }
    };
  }

  /** {@inheritDoc} */
  @Override
  public DocumentIndexes documentIndexes(LongSupplier nextOrdinal) {
    Map<String, CompletableFuture<Index>> indexes = new LinkedHashMap<>();
    return (target, calendar) -> {
      String code = calendar.documentCompetition();
      if (code == null) return null;
      long year = Long.parseLong(target.seasonLabel().substring(0, 4));
      if (properties.documentTeamAssociations().stream()
          .noneMatch(
              item ->
                  item.seasonStartYear() == year
                      && item.championshipReference().equals(target.competitionReference())))
        return null;
      if (!indexes.containsKey(code)) {
        // Store a completed result, including its original failure, without scheduling another
        // task or retrying an unavailable index for another pool in this passage.
        try {
          long ordinal = nextOrdinal.getAsLong();
          ProviderResponse xml =
              http.page(URI.create("https://www.lnv.fr/xml/calendrier-" + code + ".xml")).join();
          Instant observedAt = clock.instant();
          Document document =
              Jsoup.parse(new String(xml.body(), StandardCharsets.UTF_8), "", Parser.xmlParser());
          indexes.put(
              code, CompletableFuture.completedFuture(new Index(document, observedAt, ordinal)));
        } catch (RuntimeException failure) {
          indexes.put(code, CompletableFuture.failedFuture(failure));
        }
      }
      Index index = indexes.get(code).join();
      Map<String, SportingObservation.InformationSheet> sheets = new LinkedHashMap<>();
      for (SportingObservation.Match match : calendar.observation().matches()) {
        LocalDate date =
            match.facts().localDate() == null ? null : match.facts().localDate().orElse(null);
        SportingObservation.InformationSheet sheet =
            documents.informationSheet(
                index.document(),
                year,
                target.competitionReference(),
                code,
                match.home().nativeTeamReference(),
                match.away().nativeTeamReference(),
                date,
                properties.documentTeamAssociations());
        if (sheet != null) sheets.put(match.nativeMatchReference(), sheet);
      }
      return new DocumentRead(Map.copyOf(sheets), index.observedAt(), index.readOrdinal());
    };
  }

  /**
   * Native auxiliary DOM and its actual observation token, read without mutation during one
   * sequential passage. The bounded source bytes are discarded after this single parse.
   */
  private record Index(Document document, Instant observedAt, long readOrdinal) {}

  /**
   * Rejects positive contradictory seasonal evidence even without a simultaneous discovery target.
   *
   * @param response bounded provider response
   * @param target admitted seasonal scope
   * @throws LnvAcquisitionException when source context is unreadable or contradicts the season
   */
  private void requireSeason(ProviderResponse response, CollectionBackend.Target target) {
    String season = LnvPage.season(LnvPage.parse(response.body(), response.url()));
    if (season != null && !season.equals(target.seasonLabel())) throw LnvPage.invalid();
  }

  /**
   * Checks every detail/document request against the admitted identity, including redirects.
   *
   * @param url actual page or form-action URL
   * @param target admitted native match/championship and optional phase/group
   * @throws LnvAcquisitionException when the URL contradicts an admitted identity
   */
  private void requireMatch(URI url, CollectionBackend.Target target) {
    Map<String, String> fields = LnvPage.query(url);
    if (!target.nativeMatchReference().equals(fields.get("mID"))
        || !target.competitionReference().equals(fields.get("ID"))
        || fields.containsKey("PID") && !fields.get("PID").equals(target.poolReference())
        || fields.containsKey("CID") && !fields.get("CID").equals(target.groupReference()))
      throw LnvPage.invalid();
  }

  /**
   * {@inheritDoc}
   *
   * <p>The shared native cache retains image freshness. Only a new supplier body receives an
   * observation time; cache reuse cannot advance collection evidence.
   */
  @Override
  public Read<byte[]> image(URI uri) {
    ProviderResponse response = http.image(uri).join();
    return response.supplierRead() ? new Read<>(response.body(), clock.instant()) : null;
  }
}
