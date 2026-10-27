package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.ClubSheets;
import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.http.message.BasicNameValuePair;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.FormElement;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Reads a single encountered FFVB club through the currently published lookup form. */
@Component
public class FfvbClubSheets implements ClubSheets {
  private static final URI LOOKUP =
      URI.create("https://www.ffvbbeach.org/ffvbapp/adressier/recherche.php");
  private final ProviderHttpClient http;

  /**
   * Shares the FFVB request budget with competition acquisition.
   *
   * @param http existing bounded FFVB transport, including origin/redirect checks
   */
  public FfvbClubSheets(@Qualifier("ffvbProviderClient") ProviderHttpClient http) {
    this.http = http;
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Club read(String reference) {
    if (reference == null || reference.isBlank()) throw invalid();
    ProviderResponse response = http.page(LOOKUP).join();
    Document document =
        Jsoup.parse(new String(response.body(), FfvbPage.CHARSET), response.url().toString());
    List<FormElement> forms =
        document.select("form").stream()
            .filter(FormElement.class::isInstance)
            .map(FormElement.class::cast)
            .filter(
                form ->
                    form.elements().stream()
                        .anyMatch(input -> input.attr("name").equals("id_club")))
            .toList();
    if (forms.size() != 1) throw invalid();
    FormElement form = forms.getFirst();
    if (!"post".equalsIgnoreCase(form.attr("method")) || !form.hasAttr("action")) throw invalid();
    List<NameValuePair> fields =
        form.formData().stream()
            .map(
                field ->
                    (NameValuePair)
                        new BasicNameValuePair(
                            field.key(), field.key().equals("id_club") ? reference : field.value()))
            .toList();
    if (fields.stream().filter(field -> field.getName().equals("id_club")).count() != 1)
      throw invalid();
    return parse(http.post(URI.create(form.absUrl("action")), fields).join(), reference);
  }

  /**
   * Interprets attributable labeled sheet fields without inventing missing values or a logo feed.
   * Invalid nonblank field proposals reach F02's field validator; absent labels stay unknown and
   * explicit empty cells withdraw only that source value.
   *
   * @param body complete Windows-1252 sheet, held only for this interpretation
   * @param reference exact expected encountered identity
   * @return qualified source proposals without an inferred withdrawal
   * @throws FfvbAcquisitionException when labels or identity cannot establish an attributable sheet
   */
  static SportingObservation.Club parse(byte[] body, String reference) {
    Document page = Jsoup.parse(new String(body, FfvbPage.CHARSET));
    Map<String, String> fields = new LinkedHashMap<>();
    for (Element row : page.select("tr")) {
      List<Element> cells = row.children().stream().filter(cell -> cell.is("td,th")).toList();
      if (cells.size() != 2 || !cells.getFirst().select("table").isEmpty()) continue;
      String label =
          cells.getFirst().text().strip().replaceFirst("\\s*:\\s*$", "").toLowerCase(Locale.FRENCH);
      if (!Set.of(
              "code club",
              "nom du club",
              "adresse",
              "ville",
              "code postal",
              "email",
              "téléphone",
              "site web")
          .contains(label)) continue;
      String value = cells.getLast().text().strip();
      if (fields.putIfAbsent(label, value) != null && !fields.get(label).equals(value))
        throw invalid();
    }
    if (!reference.equals(fields.get("code club"))
        || !fields.containsKey("nom du club")
        || fields.get("nom du club").isBlank()) throw invalid();
    return SportingObservation.Club.builder()
        .sourceName(fields.get("nom du club"))
        .address(proposal(fields, "adresse"))
        .city(proposal(fields, "ville"))
        .postalCode(proposal(fields, "code postal"))
        .email(proposal(fields, "email"))
        .phone(proposal(fields, "téléphone"))
        .website(proposal(fields, "site web"))
        .build();
  }

  /**
   * Preserves omission versus explicit source absence independently for each recognized field.
   *
   * @param fields qualified labeled sheet values
   * @param label exact supported native label
   * @return absent wrapper for unknown, present null for empty, otherwise the unvalidated proposal
   */
  private static JsonNullable<String> proposal(Map<String, String> fields, String label) {
    if (!fields.containsKey(label)) return JsonNullable.undefined();
    String value = fields.get(label);
    return JsonNullable.of(value.isBlank() ? null : value);
  }

  /** Creates a fixed safe diagnostic without any club contacts or provider payload. */
  private static FfvbAcquisitionException invalid() {
    return new FfvbAcquisitionException("Unqualified FFVB club sheet or lookup form");
  }
}
