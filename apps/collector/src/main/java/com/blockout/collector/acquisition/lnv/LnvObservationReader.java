package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionProperties;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
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
  private final LnvTeamImages images;
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
   * @param images native image caching
   * @param documents published document forms and references
   * @param properties explicitly verified document-label associations
   * @param clock source completion times
   */
  public LnvObservationReader(
      @Qualifier("lnvProviderClient") ProviderHttpClient http,
      LnvCalendarParser calendars,
      LnvStandingsParser standings,
      LnvDetailParser details,
      LnvTeamImages images,
      LnvDocumentReferences documents,
      AcquisitionProperties properties,
      Clock clock) {
    this.http = http;
    this.calendars = calendars;
    this.standings = standings;
    this.details = details;
    this.images = images;
    this.documents = documents;
    this.properties = properties;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public Resource read(URI uri) {
    ProviderHttpClient.Response response = http.page(uri).join();
    Instant observedAt = clock.instant();
    return new Resource() {
      /** {@inheritDoc} */
      @Override
      public Calendar calendar(CollectionBackend.Target target) {
        LnvCalendarParser.Read read =
            calendars.parse(
                response.body(),
                response.url(),
                target.competitionReference(),
                target.poolReference(),
                target.groupReference());
        String title =
            LnvPage.parse(response.body(), response.url())
                .getElementById("Content_Main_" + target.groupReference())
                .select("[id$=lbl_title]")
                .text();
        return new Calendar(
            read.calendar(), read.logos(), observedAt, documents.competitionCode(title));
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Standings> standings(CollectionBackend.Target target) {
        if (!target.competitionReference().equals(LnvPage.query(response.url()).get("ID"))
            || !target.poolReference().equals(LnvPage.query(response.url()).get("PID")))
          throw LnvPage.invalid();
        return new Read<>(
            standings.parse(response.body(), response.url(), target.groupReference()), observedAt);
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Facts> detail(CollectionBackend.Target target) {
        return new Read<>(
            details.parse(
                response.body(),
                response.url(),
                target.nativeMatchReference(),
                target.competitionReference()),
            observedAt);
      }

      /** {@inheritDoc} */
      @Override
      public Read<SportingObservation.Facts> document(String label) {
        LnvDocumentReferences.Form form = documents.form(response.body(), response.url(), label);
        if (form == null) return null;
        ProviderHttpClient.Response document = http.postPage(form.action(), form.fields()).join();
        if (!LnvPage.query(response.url())
            .get("mID")
            .equals(LnvPage.query(document.url()).get("mID"))) throw LnvPage.invalid();
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
  public DocumentIndexes documentIndexes() {
    Map<String, Optional<Read<byte[]>>> indexes = new LinkedHashMap<>();
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
        // Cache failure too: one unavailable index is not retried per match or pool in this
        // passage.
        indexes.put(code, Optional.empty());
        ProviderHttpClient.Response xml =
            http.page(URI.create("https://www.lnv.fr/xml/calendrier-" + code + ".xml")).join();
        indexes.put(code, Optional.of(new Read<>(xml.body(), clock.instant())));
      }
      Read<byte[]> index = indexes.get(code).orElseThrow(LnvPage::invalid);
      Map<String, SportingObservation.InformationSheet> sheets = new LinkedHashMap<>();
      for (SportingObservation.Match match : calendar.observation().matches()) {
        LocalDate date =
            match.facts().localDate() == null ? null : match.facts().localDate().orElse(null);
        SportingObservation.InformationSheet sheet =
            documents.informationSheet(
                index.observation(),
                year,
                target.competitionReference(),
                code,
                match.home().nativeTeamReference(),
                match.away().nativeTeamReference(),
                date,
                properties.documentTeamAssociations());
        if (sheet != null) sheets.put(match.nativeMatchReference(), sheet);
      }
      return new Read<>(Map.copyOf(sheets), index.observedAt());
    };
  }

  /** {@inheritDoc} */
  @Override
  public Read<byte[]> image(URI uri) {
    LnvTeamImages.Image image = images.read(uri);
    return image == null ? null : new Read<>(image.bytes(), image.observedAt());
  }
}
