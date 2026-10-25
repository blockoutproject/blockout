package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.model.SportingPublicInput;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** One native document per stable resource UUID, containing only permitted matching inputs. */
public record SearchDocuments(
    UUID id,
    List<String> names,
    List<String> context,
    String city,
    UUID seasonId,
    UUID divisionId,
    String format,
    String gender) {
  /**
   * Detaches permitted matching inputs without retaining SQL state.
   *
   * @param id stable owner identity
   * @param names current source, public and qualified alias names
   * @param context available permitted sporting labels
   * @param city authorized city, or null including intentional absence
   * @param seasonId exact season, absent for clubs
   * @param divisionId exact known division, or null
   * @param format exact canonical format wire value, or null
   * @param gender exact canonical gender wire value, or null
   */
  public SearchDocuments {
    names = List.copyOf(names);
    context = List.copyOf(context);
  }

  /**
   * Projects an already-authorized F02 input without guessing absent relationships or labels.
   *
   * @param input current bounded owner input, with aliases already scoped by F02
   * @return one native matching document; presentation remains with F03
   */
  public static SearchDocuments from(SportingPublicInput input) {
    List<String> names = new ArrayList<>();
    add(names, input.sourceName());
    add(names, input.effectiveName());
    add(names, input.effectiveShortName());
    input.aliases().forEach(alias -> add(names, alias.name()));
    List<String> context = new ArrayList<>();
    add(context, input.clubName());
    add(context, input.divisionName());
    input.divisionTerms().forEach(term -> add(context, term));
    String format =
        input.classification() == null || input.classification().format() == null
            ? null
            : input.classification().format().getValue();
    String gender =
        input.classification() == null || input.classification().gender() == null
            ? null
            : input.classification().gender().getValue();
    add(context, format);
    if (input.classification() != null && input.classification().gender() != null)
      add(
          context,
          switch (input.classification().gender()) {
            case FEMALE -> "féminin";
            case MALE -> "masculin";
            case MIXED -> "mixte";
          });
    return new SearchDocuments(
        input.id(),
        names.stream().distinct().toList(),
        context.stream().distinct().toList(),
        input.city(),
        input.seasonId(),
        input.classification() == null ? null : input.classification().divisionId(),
        format,
        gender);
  }

  /**
   * Keeps absent context absent rather than adding a fabricated searchable value.
   *
   * @param values document field receiving available labels
   * @param value current permitted label, or null
   */
  private static void add(List<String> values, String value) {
    if (value != null && !value.isBlank()) values.add(value);
  }
}
