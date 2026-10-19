package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.ContextSlotKindEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import java.io.IOException;
import java.io.StringReader;
import java.io.UncheckedIOException;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.csv.DuplicateHeaderMode;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

/** FFVB CSV interpretation bounded to independently qualified HTML pool/group membership. */
@Component
public class FfvbCalendarParser {
  private static final List<String> HEADERS =
      List.of(
          "Entité", "Jo", "Match", "Date", "Heure", "EQA_no", "EQA_nom", "EQB_no", "EQB_nom", "Set",
          "Score", "Total", "Salle", "Arb1", "Arb2", "");
  private static final CSVFormat FORMAT =
      CSVFormat.DEFAULT
          .builder()
          .setDelimiter(';')
          .setHeader()
          .setSkipHeaderRecord(true)
          .setAllowMissingColumnNames(true)
          .setDuplicateHeaderMode(DuplicateHeaderMode.DISALLOW)
          .get();

  /**
   * Interprets selected rows without treating discarded rows as absent sporting resources.
   *
   * @param body complete bounded Windows-1252 export
   * @param page positively qualified full calendar context
   * @param scope expected native identity
   * @return independently usable matches and attributable failures, never synthesized absence
   * @throws FfvbAcquisitionException for unreadable structure or unqualified overall context
   */
  public SportingObservation.Calendar parse(byte[] body, FfvbPage page, FfvbScope scope) {
    if (!page.calendarPresent())
      throw new FfvbAcquisitionException("FFVB calendar completeness is not established");
    Map<String, CSVRecord> selected = new LinkedHashMap<>();
    Set<String> contradictions = new LinkedHashSet<>();
    Set<String> malformed = new LinkedHashSet<>();
    List<SportingObservation.Failure> failures = new ArrayList<>();
    try (CSVParser csv = FORMAT.parse(new StringReader(new String(body, FfvbPage.CHARSET)))) {
      if (!csv.getHeaderNames().equals(HEADERS))
        throw new FfvbAcquisitionException("Unsupported FFVB calendar columns");
      for (CSVRecord row : csv) {
        if (!row.isConsistent()) {
          String reference = row.size() > 2 ? row.get(2).strip() : "row-" + row.getRecordNumber();
          if (page.references().contains(reference)) malformed.add(reference);
          else if (!page.allReferences().contains(reference))
            failures.add(failure(reference, "invalid-row"));
          continue;
        }
        if (page.qualifiedEmpty())
          throw new FfvbAcquisitionException("Nonempty export contradicts the empty FFVB calendar");
        if (!scope.organizerReference().equals(row.get("Entité")))
          throw new FfvbAcquisitionException("Wrong FFVB organizer in export");
        String reference = row.get("Match").strip();
        if (reference.isEmpty()) {
          failures.add(failure("row-" + row.getRecordNumber(), "invalid-match-reference"));
          continue;
        }
        if (!page.allReferences().contains(reference)) {
          failures.add(failure(reference, "unqualified-match-context"));
          continue;
        }
        if (!page.references().contains(reference)) continue;
        CSVRecord previous = selected.putIfAbsent(reference, row);
        if (previous != null && !previous.toList().equals(row.toList()))
          contradictions.add(reference);
      }
    } catch (IOException | UncheckedIOException | IllegalArgumentException exception) {
      throw new FfvbAcquisitionException("Unreadable FFVB calendar export");
    }
    List<SportingObservation.Match> matches = new ArrayList<>();
    List<SportingObservation.ContextSlot> slots = new ArrayList<>();
    Set<String> orderedReferences = new LinkedHashSet<>(selected.keySet());
    orderedReferences.addAll(page.references());
    for (String reference : orderedReferences) {
      CSVRecord row = selected.get(reference);
      if (row == null || malformed.contains(reference) || contradictions.contains(reference)) {
        failures.add(
            failure(
                reference,
                malformed.contains(reference)
                    ? "invalid-row"
                    : row == null ? "missing-match" : "contradictory-match"));
        continue;
      }
      String home = row.get("EQA_nom").strip();
      String away = row.get("EQB_nom").strip();
      if (home.equalsIgnoreCase("xxxxx") || away.equalsIgnoreCase("xxxxx")) {
        slots.add(new SportingObservation.ContextSlot(reference, ContextSlotKindEnum.BYE));
      } else if (home.equalsIgnoreCase("A déterminer") || away.equalsIgnoreCase("A déterminer")) {
        slots.add(
            new SportingObservation.ContextSlot(
                reference, ContextSlotKindEnum.UNDETERMINED_QUALIFIER));
      } else if (home.isEmpty()
          || away.isEmpty()
          || row.get("EQA_no").isBlank()
          || row.get("EQB_no").isBlank()) {
        failures.add(failure(reference, "invalid-participant"));
      } else {
        matches.add(
            new SportingObservation.Match(
                reference,
                new SportingObservation.Team(home, null, row.get("EQA_no").strip(), null),
                new SportingObservation.Team(away, null, row.get("EQB_no").strip(), null),
                facts(row, failures),
                null));
      }
    }
    if (matches.size() + slots.size() + failures.size() > 1000)
      throw new FfvbAcquisitionException("FFVB calendar exceeds the observation item bound");
    return new SportingObservation.Calendar(failures.isEmpty(), matches, slots, failures);
  }

  /**
   * Preserves unknown fields and isolates malformed proposals without zero substitution.
   *
   * @param row identifiable match
   * @param failures safe field diagnostics for the same observation
   * @return valid proposals only; invalid values remain omitted
   */
  private SportingObservation.Facts facts(
      CSVRecord row, List<SportingObservation.Failure> failures) {
    SportingObservation.Facts.FactsBuilder facts = SportingObservation.Facts.builder();
    String reference = row.get("Match").strip();
    String date = row.get("Date").strip();
    if (date.isEmpty()) facts.localDate(JsonNullable.of(null));
    else {
      try {
        facts.localDate(JsonNullable.of(LocalDate.parse(date)));
      } catch (DateTimeParseException invalid) {
        failures.add(failure(reference, "invalid-date"));
      }
    }
    String time = row.get("Heure").strip();
    if (time.isEmpty() || time.equals("00:00")) facts.localTime(JsonNullable.of(null));
    else {
      try {
        if (!time.matches("\\d{2}:\\d{2}")) throw new DateTimeParseException("Invalid time", "", 0);
        LocalTime.parse(time);
        facts.localTime(JsonNullable.of(time)).timeZone("Europe/Paris");
      } catch (DateTimeParseException invalid) {
        failures.add(failure(reference, "invalid-time"));
      }
    }
    String result = row.get("Set").strip();
    if (!result.isEmpty()) {
      if (Set.of("F/P", "3/F", "3/P", "F/F", "2/F").contains(result)) {
        facts.result(
            JsonNullable.of(
                new SportingObservation.Result(ResultStateEnum.UNCONFIRMED, null, null, result)));
      } else if (result.matches("[0-9]+/[0-9]+")) {
        String[] values = result.split("/");
        try {
          facts.result(
              JsonNullable.of(
                  new SportingObservation.Result(
                      ResultStateEnum.UNCONFIRMED,
                      Integer.valueOf(values[0]),
                      Integer.valueOf(values[1]),
                      null)));
        } catch (NumberFormatException invalid) {
          failures.add(failure(reference, "invalid-result"));
        }
      } else failures.add(failure(reference, "invalid-result"));
    }
    String scores = row.get("Score").strip();
    if (!scores.isEmpty()) {
      List<SportingObservation.SetScore> sets = new ArrayList<>();
      try {
        for (String score : scores.split(",", -1)) {
          if (!score.strip().matches("[0-9]+-[0-9]+")) throw new NumberFormatException();
          String[] points = score.strip().split("-");
          sets.add(
              new SportingObservation.SetScore(
                  Integer.parseInt(points[0]), Integer.parseInt(points[1])));
        }
        facts.sets(JsonNullable.of(sets));
      } catch (NumberFormatException invalid) {
        failures.add(failure(reference, "invalid-sets"));
      }
    }
    if (!row.get("Salle").isBlank()) facts.venueName(JsonNullable.of(row.get("Salle").strip()));
    List<String> referees =
        List.of(row.get("Arb1").strip(), row.get("Arb2").strip()).stream()
            .filter(name -> !name.isEmpty())
            .toList();
    if (!referees.isEmpty()) facts.referees(JsonNullable.of(referees));
    return facts.build();
  }

  /**
   * Builds an attributable failure without retaining its source row.
   *
   * @param reference safe native match reference
   * @param kind fixed reason category
   * @return diagnostic without raw values
   */
  private SportingObservation.Failure failure(String reference, String kind) {
    return new SportingObservation.Failure(
        reference, URI.create("urn:blockout:acquisition:" + kind));
  }
}
