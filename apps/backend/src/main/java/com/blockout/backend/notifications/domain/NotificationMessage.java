package com.blockout.backend.notifications.domain;

/**
 * Derived French text, never stored alongside a personal entry or used to infer an announcement.
 *
 * @param title family-specific French heading
 * @param body current reliable sporting facts with honest absence wording
 */
public record NotificationMessage(String title, String body) {
  /**
   * Renders a persisted family/choice from current authorized owner projections.
   *
   * @param family immutable announcement family
   * @param variant immutable editorial choice
   * @param facts current facts, including withdrawals and unavailable links
   * @return safe title and body, with no current-stream, free-access or winner claim
   */
  public static NotificationMessage render(
      NotificationFamily family, NotificationVariant variant, Facts facts) {
    String match = match(facts);
    String result = result(facts);
    String link =
        facts.publicLink() ? "Un lien a été proposé pour ce match." : "Le lien n’est plus proposé.";
    return switch (family) {
      case PLAIN_RESULT ->
          switch (variant) {
            case FIRST ->
                new NotificationMessage(
                    "Le point côté terrain", "Petit tour du terrain : " + match + ". " + result);
            case SECOND ->
                new NotificationMessage(
                    "Des nouvelles du match", "On fait le point sur " + match + " : " + result);
            case THIRD ->
                new NotificationMessage(
                    "Côté résultat", "Côté tableau de bord : " + match + ". " + result);
          };
      case ENRICHED_RESULT ->
          switch (variant) {
            case FIRST ->
                new NotificationMessage(
                    "Le match à retrouver",
                    "Retour côté terrain pour " + match + ". " + result + " " + link);
            case SECOND ->
                new NotificationMessage(
                    "Des nouvelles du terrain",
                    "Petit récap : " + match + ". " + result + " " + link);
            case THIRD ->
                new NotificationMessage(
                    "Le point sur votre match",
                    "Un coup d’œil sur " + match + ". " + result + " " + link);
          };
      case LIVE_LINK ->
          switch (variant) {
            case FIRST ->
                new NotificationMessage("Côté tribunes", "Pour suivre " + match + " : " + link);
            case SECOND ->
                new NotificationMessage(
                    "Un regard sur le terrain", "On retrouve " + match + ". " + link);
            case THIRD ->
                new NotificationMessage(
                    "Autour du match", "Petit passage côté terrain : " + match + ". " + link);
          };
      case POST_RESULT_LINK ->
          switch (variant) {
            case FIRST ->
                new NotificationMessage(
                    "Retour sur le match", "Pour retrouver " + match + " : " + link);
            case SECOND ->
                new NotificationMessage(
                    "Le match côté lien", "Un autre regard sur " + match + ". " + link);
            case THIRD ->
                new NotificationMessage(
                    "Un détour par le terrain", "Un détour côté terrain : " + match + ". " + link);
          };
    };
  }

  /**
   * Names only currently available participants, without inventing the missing opponent.
   *
   * @param facts current reliable names
   * @return a usable match reference even when neither name is known
   */
  private static String match(Facts facts) {
    String home = facts.homeName() == null ? "" : facts.homeName().strip();
    String away = facts.awayName() == null ? "" : facts.awayName().strip();
    if (!home.isEmpty() && !away.isEmpty()) return "le match " + home + " – " + away;
    if (!home.isEmpty() || !away.isEmpty()) return "le match de " + (home.isEmpty() ? away : home);
    return "ce match";
  }

  /**
   * Removes withdrawn/provisional scores and uses owner-recognized special notation honestly.
   *
   * @param facts current accepted finality and attributable values
   * @return current result wording with no inferred winner or synthetic score
   */
  private static String result(Facts facts) {
    if (!facts.finalResult()) return "Le résultat n’est pas confirmé actuellement.";
    if (facts.specialResult() != null && !facts.specialResult().isBlank())
      return "Résultat particulier : " + facts.specialResult() + ".";
    if (facts.homeSets() != null && facts.awaySets() != null)
      return "Score final : " + facts.homeSets() + "–" + facts.awaySets() + ".";
    return "Résultat confirmé, score indisponible.";
  }

  /**
   * Transient editorial inputs from current reliable projections, never persistence or authority.
   *
   * @param homeName current home name, or absent
   * @param awayName current away name, or absent
   * @param finalResult whether the current owner still recognizes a final result
   * @param homeSets current reliable home total, or absent
   * @param awaySets current reliable away total, or absent
   * @param specialResult recognized special notation, or absent
   * @param publicLink whether F08 currently permits a public link
   */
  public record Facts(
      String homeName,
      String awayName,
      boolean finalResult,
      Integer homeSets,
      Integer awaySets,
      String specialResult,
      boolean publicLink) {}
}
