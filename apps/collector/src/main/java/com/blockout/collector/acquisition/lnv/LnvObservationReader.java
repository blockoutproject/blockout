package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.ProviderObservation;
import com.blockout.collector.acquisition.application.ProviderReadAttempt;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionProperties;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
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
  private final LnvStandingsParser standings;
  private final LnvDetailParser details;
  private final LnvDocumentReferences documents;
  private final AcquisitionProperties properties;
  private final Clock clock;

  /**
   * Composes independent source interpreters without another runtime or persistence boundary.
   *
   * @param http shared LNV transport
   * @param standings official tables
   * @param details match details
   * @param documents published document forms and references
   * @param properties explicitly verified document-label associations
   * @param clock source completion times
   */
  public LnvObservationReader(
      @Qualifier("lnvProviderClient") ProviderHttpClient http,
      LnvStandingsParser standings,
      LnvDetailParser details,
      LnvDocumentReferences documents,
      AcquisitionProperties properties,
      Clock clock) {
    this.http = http;
    this.standings = standings;
    this.details = details;
    this.documents = documents;
    this.properties = properties;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public Resource read(URI uri) {
    ProviderResponse response = http.page(uri);
    Instant observedAt = clock.instant();
    return fromPage(LnvPage.parse(response.body(), response.url()), response.url(), observedAt);
  }

  /** {@inheritDoc} */
  @Override
  public Resource fromPage(Document page, URI url, Instant observedAt) {
    return new Resource() {
      // Each admitted scope reports a contradictory heading through its own acquisition outcome.
      private final ProviderReadAttempt<String> seasonHeading =
          ProviderReadAttempt.capture(() -> LnvPage.seasonHeading(page));
      private LnvCalendarParser calendars;

      /** {@inheritDoc} */
      @Override
      public Calendar calendar(CollectionBackend.Target target) {
        if (calendars == null) {
          calendars = new LnvCalendarParser(page, url, seasonHeading);
        }
        LnvCalendarParser.Read read =
            calendars.parse(
                target.competitionReference(),
                target.poolReference(),
                target.groupReference(),
                target.seasonLabel());
        return new Calendar(
            read.calendar(),
            read.logos(),
            observedAt,
            documents.competitionCode(read.groupTitle()));
      }

      /** {@inheritDoc} */
      @Override
      public ProviderObservation<SportingObservation.Standings> standings(
          CollectionBackend.Target target) {
        requireSeason(seasonHeading.value(), target);
        Map<String, String> fields = LnvPage.query(url);
        if (!target.competitionReference().equals(fields.get("ID"))
            || fields.containsKey("PID") && !target.poolReference().equals(fields.get("PID"))) {
          throw LnvPage.invalid();
        }
        return new ProviderObservation<>(
            standings.parse(page, target.groupReference()), observedAt);
      }

      /** {@inheritDoc} */
      @Override
      public Detail detail(CollectionBackend.Target target) {
        requireSeason(seasonHeading.value(), target);
        requireMatch(url, target);
        LnvDetailParser.Read read = details.inspect(page);
        return new Detail(read.facts(), observedAt, read.complete());
      }

      /** {@inheritDoc} */
      @Override
      public Detail document(CollectionBackend.Target target, String label) {
        requireSeason(seasonHeading.value(), target);
        requireMatch(url, target);
        LnvDocumentReferences.Form form = documents.form(page, url, label);
        if (form == null) {
          return null;
        }
        requireMatch(form.action(), target);
        ProviderResponse document = http.postPage(form.action(), form.fields(), LnvPage.CHARSET);
        requireMatch(document.url(), target);
        Document published = LnvPage.parse(document.body(), document.url());
        requireSeason(LnvPage.seasonHeading(published), target);
        URI pdf = documents.publishedPdf(published);
        if (pdf == null && documents.unavailableFile(published)) {
          return null;
        }
        if (pdf == null) {
          throw LnvPage.invalid();
        }
        SportingObservation.Facts facts =
            label.equals("Scoresheet")
                ? SportingObservation.Facts.builder().scoresheetUrl(JsonNullable.of(pdf)).build()
                : SportingObservation.Facts.builder().statisticsUrl(JsonNullable.of(pdf)).build();
        return new Detail(facts, clock.instant());
      }
    };
  }

  /** {@inheritDoc} */
  @Override
  public DocumentIndexes documentIndexes(LongSupplier nextOrdinal) {
    Map<String, ProviderReadAttempt<Index>> indexes = new LinkedHashMap<>();
    return (target, calendar) -> {
      String code = calendar.documentCompetition();
      if (code == null) {
        return null;
      }
      long year = Long.parseLong(target.seasonLabel().substring(0, 4));
      if (properties.documentTeamAssociations().stream()
          .noneMatch(
              item ->
                  item.seasonStartYear() == year
                      && item.championshipReference().equals(target.competitionReference()))) {
        return null;
      }
      Index index =
          indexes
              .computeIfAbsent(
                  code, key -> ProviderReadAttempt.capture(() -> readIndex(key, nextOrdinal)))
              .value();
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
        if (sheet != null) {
          sheets.put(match.nativeMatchReference(), sheet);
        }
      }
      return new DocumentRead(Map.copyOf(sheets), index.observedAt(), index.readOrdinal());
    };
  }

  private Index readIndex(String code, LongSupplier nextOrdinal) {
    long ordinal = nextOrdinal.getAsLong();
    ProviderResponse xml =
        http.page(URI.create("https://www.lnv.fr/xml/calendrier-" + code + ".xml"));
    Instant observedAt = clock.instant();
    Document document =
        Jsoup.parse(new String(xml.body(), LnvPage.CHARSET), "", Parser.xmlParser());
    return new Index(document, observedAt, ordinal);
  }

  /**
   * Native auxiliary DOM and its actual observation token, read without mutation during one
   * sequential passage. The bounded source bytes are discarded after this single parse.
   */
  private record Index(Document document, Instant observedAt, long readOrdinal) {}

  /**
   * Checks the published season heading on standings, detail and document pages.
   *
   * @param season heading resolved from the relevant response, if published
   * @param target admitted seasonal scope
   * @throws LnvAcquisitionException when source context is unreadable or contradicts the season
   */
  private void requireSeason(String season, CollectionBackend.Target target) {
    if (season != null && !season.equals(target.seasonLabel())) {
      throw LnvPage.invalid();
    }
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
        || fields.containsKey("CID") && !fields.get("CID").equals(target.groupReference())) {
      throw LnvPage.invalid();
    }
  }

  /**
   * {@inheritDoc}
   *
   * <p>The shared native cache retains image freshness. Only a new supplier body receives an
   * observation time; cache reuse cannot advance collection evidence.
   */
  @Override
  public ProviderObservation<byte[]> image(URI uri) {
    ProviderResponse response = http.get(uri);
    return response.supplierRead()
        ? new ProviderObservation<>(response.body(), clock.instant())
        : null;
  }
}
