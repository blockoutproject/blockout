package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.net.URIBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.openapitools.jackson.nullable.JsonNullable;

/** Native LNV context and rendered-clock interpretation shared by its explicit parsers. */
final class LnvPage {
  /** Prevents construction of this native page helper. */
  private LnvPage() {}

  /**
   * Parses complete transport bytes without executing scripts or issuing HTTP requests.
   *
   * @param bytes bounded complete HTML
   * @param url qualified response context
   * @return local DOM for this read only
   */
  static Document parse(byte[] bytes, URI url) {
    return Jsoup.parse(new String(bytes, StandardCharsets.UTF_8), url.toString());
  }

  /**
   * Reads native query parameters without accepting contradictory duplicates.
   *
   * @param uri published URL
   * @return exact provider values
   */
  static Map<String, String> query(URI uri) {
    Map<String, String> values = new LinkedHashMap<>();
    for (NameValuePair field : new URIBuilder(uri).getQueryParams()) {
      String previous = values.putIfAbsent(field.getName(), field.getValue());
      if (previous != null && !previous.equals(field.getValue())) throw invalid();
    }
    return values;
  }

  /**
   * Normalizes only a rendered clock acquired under the confirmed offset-zero convention. Date-only
   * publication remains local date evidence, with no fabricated instant or timezone.
   *
   * @param rendered native visible date with an optional clock
   * @param dateFormat calendar/detail's independently selected date format
   * @return source-managed date/time proposals
   */
  static SportingObservation.Facts time(String rendered, DateTimeFormatter dateFormat) {
    String[] parts = rendered.strip().split("\\s+-\\s+", 2);
    LocalDate date;
    try {
      date =
          LocalDate.parse(
              parts[0].toLowerCase(Locale.FRENCH),
              dateFormat.withResolverStyle(ResolverStyle.STRICT));
    } catch (java.time.DateTimeException failure) {
      throw invalid();
    }
    if (parts.length == 1 || parts[1].equals("--:--"))
      return SportingObservation.Facts.builder()
          .localDate(JsonNullable.of(date))
          .localTime(JsonNullable.of(null))
          .build();
    try {
      LocalTime time = LocalTime.parse(parts[1], DateTimeFormatter.ofPattern("H:mm"));
      LocalDateTime paris =
          date.atTime(time)
              .atOffset(ZoneOffset.UTC)
              .atZoneSameInstant(ZoneId.of("Europe/Paris"))
              .toLocalDateTime();
      return SportingObservation.Facts.builder()
          .localDate(JsonNullable.of(paris.toLocalDate()))
          .localTime(JsonNullable.of(paris.toLocalTime().toString()))
          .timeZone("Europe/Paris")
          .build();
    } catch (java.time.DateTimeException failure) {
      throw invalid();
    }
  }

  /**
   * @return a fixed payload-free diagnostic for missing or contradictory native context
   */
  static LnvAcquisitionException invalid() {
    return new LnvAcquisitionException("Unqualified LNV page context");
  }
}
