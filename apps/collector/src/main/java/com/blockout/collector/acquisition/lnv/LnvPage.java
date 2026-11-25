package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.ProviderQuery;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.openapitools.jackson.nullable.JsonNullable;

/** UTF-8 HTML decoding, native LNV context and rendered-clock interpretation. */
public final class LnvPage {
  static final Charset CHARSET = StandardCharsets.UTF_8;
  static final DateTimeFormatter CALENDAR_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/uuuu");

  private static final String GROUP_ID_PREFIX = "Content_Main_";
  private static final Pattern SEASON_HEADING =
      Pattern.compile("(20[0-9]{2})[/\\u2013-](20[0-9]{2})");
  // Start at the whitespace run's boundary to avoid retrying from every space in the run.
  private static final Pattern CLOCK_SEPARATOR = Pattern.compile("(?<=\\S)\\s+-\\s+");

  /** Prevents construction of this native page helper. */
  private LnvPage() {}

  /**
   * Parses complete transport bytes without executing scripts or issuing HTTP requests.
   *
   * @param bytes bounded complete HTML
   * @param url qualified response context
   * @return local DOM for this read only
   */
  public static Document parse(byte[] bytes, URI url) {
    return Jsoup.parse(new String(bytes, CHARSET), url.toString());
  }

  /**
   * Reads native query parameters without accepting contradictory duplicates.
   *
   * @param uri published URL
   * @return exact provider values
   */
  static Map<String, String> query(URI uri) {
    return ProviderQuery.fields(uri, LnvPage::invalid);
  }

  /**
   * Normalizes only a rendered clock acquired under the confirmed offset-zero convention. Date-only
   * publication remains local date evidence, with no fabricated instant or timezone.
   *
   * @param rendered native visible date with an optional clock
   * @param dateFormat calendar/detail's independently selected date format
   * @return source-managed date/time proposals
   * @throws LnvAcquisitionException when the published date or clock has unsupported syntax
   */
  static SportingObservation.Facts time(String rendered, DateTimeFormatter dateFormat) {
    if (rendered.isBlank()) {
      return SportingObservation.Facts.builder()
          .localDate(JsonNullable.of(null))
          .localTime(JsonNullable.of(null))
          .build();
    }
    String[] parts = CLOCK_SEPARATOR.split(rendered.strip(), 2);
    LocalDate date = date(parts[0], dateFormat);
    if (parts.length == 1 || parts[1].equals("--:--")) {
      return SportingObservation.Facts.builder()
          .localDate(JsonNullable.of(date))
          .localTime(JsonNullable.of(null))
          .build();
    }
    try {
      LocalTime time =
          LocalTime.parse(
              parts[1],
              DateTimeFormatter.ofPattern("H:mm").withResolverStyle(ResolverStyle.STRICT));
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
    } catch (DateTimeException failure) {
      throw invalid();
    }
  }

  static LocalDate date(String rendered, DateTimeFormatter format) {
    try {
      return LocalDate.parse(
          rendered.toLowerCase(Locale.FRENCH), format.withResolverStyle(ResolverStyle.STRICT));
    } catch (DateTimeException failure) {
      throw invalid();
    }
  }

  static String renderedDate(String rendered) {
    return CLOCK_SEPARATOR.split(rendered.strip(), 2)[0];
  }

  static Element group(Document page, String reference) {
    return page.getElementById(GROUP_ID_PREFIX + reference);
  }

  static Elements phaseGroups(Document page) {
    return page.select("div.rmpView[id^=" + GROUP_ID_PREFIX + "]");
  }

  static String phaseGroupReference(Element group) {
    return group.id().substring(GROUP_ID_PREFIX.length());
  }

  static String phaseGroupTitle(Element group) {
    Element title = group.selectFirst("[id$=lbl_title]");
    if (!phaseGroupReference(group).matches("[0-9]+") || title == null || title.text().isBlank()) {
      return null;
    }
    return title.text();
  }

  /**
   * Reads only published seasonal evidence, without deriving a year from IDs or current time.
   *
   * @param page native response DOM
   * @return one consistent sporting season, or null without positive evidence
   */
  static String seasonHeading(Document page) {
    Matcher seasons =
        SEASON_HEADING.matcher(
            page.select("title, [id$=LB_Season], select[name*=Season] option[selected]").text());
    String result = null;
    while (seasons.find()) {
      if (Integer.parseInt(seasons.group(2)) != Integer.parseInt(seasons.group(1)) + 1) {
        throw invalid();
      }
      String season = seasons.group(1) + "/" + seasons.group(2);
      if (result != null && !result.equals(season)) {
        throw invalid();
      }
      result = season;
    }
    return result;
  }

  /**
   * Checks the native rendered dates against one July-to-June season before converting any clock.
   * Dates in both civil years can establish attribution. A single readable date can contradict it.
   * An unreadable date supplies no season evidence and remains a local calendar parsing failure.
   *
   * @return independently established attribution, or null when the publication lacks it
   */
  static String calendarSeason(Elements groups, String headingSeason, String expectedSeason) {
    String requiredSeason = requireHeadingSeason(headingSeason, expectedSeason);
    SeasonDates dates = seasonDates(groups);
    dates.requireSeason(requiredSeason);
    if (headingSeason != null) {
      return headingSeason;
    }
    return dates.spansCivilYears() ? dates.season() : null;
  }

  static String requireHeadingSeason(String headingSeason, String expectedSeason) {
    if (headingSeason != null && expectedSeason != null && !expectedSeason.equals(headingSeason)) {
      throw new LnvAcquisitionException("LNV phase belongs to a different season");
    }
    return headingSeason == null ? expectedSeason : headingSeason;
  }

  static SeasonDates seasonDates(Elements groups) {
    String season = null;
    Set<Integer> calendarYears = new HashSet<>();
    for (Element dateField : groups.select("[id$=_MatchRow] [id$=_LB_DataOra]")) {
      String rendered = dateField.text();
      if (rendered.isBlank()) {
        continue;
      }
      LocalDate publishedDate;
      try {
        publishedDate = date(renderedDate(rendered), CALENDAR_DATE_FORMAT);
      } catch (LnvAcquisitionException invalidDate) {
        continue;
      }
      int startYear =
          publishedDate.getMonthValue() >= Month.JULY.getValue()
              ? publishedDate.getYear()
              : publishedDate.getYear() - 1;
      String matchSeason = startYear + "/" + (startYear + 1);
      if (season != null && !season.equals(matchSeason)) {
        return new SeasonDates(null, false, true);
      }
      season = matchSeason;
      calendarYears.add(publishedDate.getYear());
    }
    return new SeasonDates(season, calendarYears.size() == 2, false);
  }

  /** Detached native date evidence can be compared against each admitted group independently. */
  record SeasonDates(String season, boolean spansCivilYears, boolean contradictory) {
    void requireSeason(String requiredSeason) {
      if (contradictory
          || season != null && requiredSeason != null && !requiredSeason.equals(season)) {
        throw new LnvAcquisitionException("LNV phase match dates contradict the season");
      }
    }
  }

  /**
   * Preserves published official notations without manufacturing numeric scores or winners.
   *
   * @param home published home score field
   * @param away published away score field
   * @param live explicit provisional publication
   * @return absent for an unpublished/unplayed result; F02 owns interpretation of native notation
   */
  static JsonNullable<SportingObservation.Result> result(String home, String away, boolean live) {
    if (home.isBlank() && away.isBlank() || home.equals("0") && away.equals("0")) {
      return null;
    }
    String notation = home + "/" + away;
    if (!home.matches("[0-9]") || !away.matches("[0-9]")) {
      return JsonNullable.of(
          new SportingObservation.Result(ResultStateEnum.UNCONFIRMED, null, null, notation));
    }
    return JsonNullable.of(
        new SportingObservation.Result(
            live ? ResultStateEnum.PROVISIONAL : ResultStateEnum.FINAL,
            Integer.valueOf(home),
            Integer.valueOf(away),
            null));
  }

  /**
   * Builds a fixed structural diagnostic without source payloads.
   *
   * @return a fixed payload-free diagnostic for missing or contradictory native context
   */
  static LnvAcquisitionException invalid() {
    return new LnvAcquisitionException("Unqualified LNV page context");
  }
}
