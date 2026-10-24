package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;

/** Current owner values and complete commands, independent from generated objects and entities. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingPresentation {
  /** Independently managed private club fields; CITY is the municipal geocoding context. */
  public enum ContactField {
    ADDRESS,
    CITY,
    POSTAL_CODE,
    EMAIL,
    PHONE,
    WEBSITE
  }

  /** Current field state only; restriction prevails over every ordinary management mode. */
  public record ContactValue(
      String sourceValue, String manualValue, ContactModeEnum mode, boolean restricted) {
    /**
     * Resolves the currently permitted value without recovering former contacts.
     *
     * @return manual, current source or deliberate absence according to the durable mode
     */
    public String effectiveValue() {
      if (restricted) return null;
      return switch (mode) {
        case SOURCE -> sourceValue;
        case MANUAL -> manualValue;
        case HIDDEN -> null;
      };
    }
  }

  /** Immutable current contacts and their independent source freshness/order. */
  public record Contacts(
      UUID clubId,
      long revision,
      Map<ContactField, ContactValue> fields,
      ObservationOrder order,
      Instant observedAt,
      Instant providerPublishedAt) {
    /**
     * Detaches current field state; no former contact value is retained.
     *
     * @param clubId persistent organization
     * @param revision current contact editor revision
     * @param fields all six independent current field states
     * @param order latest accepted source-page token, or null
     * @param observedAt source-page observation time, or null before acceptance
     * @param providerPublishedAt supplied publication instant, or null when unknown
     */
    public Contacts {
      fields = Map.copyOf(fields);
    }
  }

  /** Desired state of one supplied contact field; omitted fields do not become commands. */
  public record ContactEdit(ContactModeEnum mode, String value) {}

  /** Source page proposal; undefined, explicit null and usable values retain distinct meanings. */
  public record ClubObservation(
      MatchObservation.Context context,
      String sourceName,
      Map<ContactField, JsonNullable<String>> fields) {
    /**
     * Detaches supplied field presence from the HTTP request.
     *
     * @param context admitted source-page observation
     * @param sourceName usable source label, or null without a name proposal
     * @param fields independent native nullable proposals
     */
    public ClubObservation {
      fields = Map.copyOf(fields);
    }
  }

  /** Independent current names; automatic short labels use the current attributable source name. */
  public record Names(
      String sourceName,
      String effectiveName,
      String manualName,
      String effectiveShortName,
      String manualShortName) {}

  /** Effective and candidate artwork references; the image's owner retains the actual bytes. */
  public record Logo(String effectiveUrl, String manualUrl, String automaticUrl) {}

  /** Detached presentation editor state, with a revision covering inherited artwork as needed. */
  public record View(UUID id, Kind kind, String revision, Names names, Logo logo) {}

  /** Complete desired names and explicit manual-image action after content validation. */
  public record Edit(
      String revision,
      String manualName,
      String manualShortName,
      LogoActionEnum logoAction,
      Image image) {
    /**
     * Rejects blank customizations while assembling the complete command before a transaction.
     *
     * @param revision captured current editing revision
     * @param manualName independent full-name override, or null for automatic naming
     * @param manualShortName independent short override, absent for a club
     * @param logoAction explicit artwork handling, absent for a pool
     * @param image already validated replacement, or null
     */
    public Edit {
      validateName(manualName);
      validateName(manualShortName);
    }
  }

  /** Division presentation remains separate from its explicit activity command. */
  public record DivisionEdit(
      String revision,
      String name,
      String color,
      List<String> gradient,
      LogoActionEnum logoAction,
      Image image) {
    /**
     * Retains explicit null rather than converting an absent gradient into empty colors.
     *
     * @param revision captured division revision
     * @param name nonblank display name
     * @param color validated primary color
     * @param gradient three validated colors, or null for derived treatment
     * @param logoAction explicit manual-artwork handling
     * @param image already validated replacement, or null
     */
    public DivisionEdit {
      if (name == null || name.isBlank()) throw new SportingValidationException();
      gradient = gradient == null ? null : List.copyOf(gradient);
    }
  }

  /** Current effective municipal point and context; technical failure has no mutation command. */
  public record Locality(
      String revision,
      String city,
      String postalCode,
      Double latitude,
      Double longitude,
      ObservationOrder order) {}

  /** A response for one exact current municipal context, independent from F01 attempt policy. */
  public record LocalityObservation(
      MatchObservation.Context context,
      String localityRevision,
      GeocodingOutcomeEnum outcome,
      Double latitude,
      Double longitude) {}

  /**
   * Accepted original content, copied at both boundaries so readers cannot mutate stored values.
   */
  public record Image(byte[] bytes, String mediaType) {
    /**
     * Freezes validated original bytes.
     *
     * @param bytes content already checked for size, dimensions and actual PNG/JPEG decoding
     * @param mediaType detected content type
     */
    public Image {
      bytes = bytes.clone();
    }

    /**
     * @return a detached copy of the current original image
     */
    @Override
    public byte[] bytes() {
      return bytes.clone();
    }

    /**
     * Compares accepted content rather than array identity for no-op replacements.
     *
     * @param other candidate accepted image, possibly null
     * @return whether both type and content are identical
     */
    public boolean sameContent(Image other) {
      return other != null
          && mediaType.equals(other.mediaType)
          && Arrays.equals(bytes, other.bytes);
    }
  }

  /**
   * Preserves explicit null as automatic naming while refusing whitespace-only customizations.
   *
   * @param name independent manual name or null
   */
  private static void validateName(String name) {
    if (name != null && name.isBlank()) throw new SportingValidationException();
  }
}
