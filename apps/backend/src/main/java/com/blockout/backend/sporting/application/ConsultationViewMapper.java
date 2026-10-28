package com.blockout.backend.sporting.application;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.shared.mapping.UriMapping;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import java.time.Instant;
import java.util.Map;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Mechanical public projection of already authorized sporting values; performs no owner reads. */
@Mapper(
    config = MappingConfiguration.class,
    uses = {TemporalMapping.class, UriMapping.class})
public interface ConsultationViewMapper {
  /**
   * Projects only the public URL and exact active identity supplied by F08.
   *
   * @param source authorized current contribution pair, without private history
   * @return public stream pair retaining the literal address
   */
  @Mapping(target = "url", source = "address")
  ConsultationViews.StreamLink toView(
      com.blockout.backend.contributions.application.ReadPublicContribution.Link source);

  /**
   * Removes source/manual metadata from an admitted effective identity.
   *
   * @param source current authorized owner presentation
   * @return public identity retaining absent short name and artwork
   */
  @Mapping(target = "name", source = "names.effectiveName")
  @Mapping(target = "shortName", source = "names.effectiveShortName")
  @Mapping(target = "logoUrl", source = "logo.effectiveUrl")
  ConsultationViews.Identity toView(SportingPresentation.View source);

  /**
   * Projects current division presentation without acquisition or editing metadata.
   *
   * @param source selected division metadata without image bytes
   * @return public division with its current backend artwork resource
   */
  @Mapping(target = "logoUrl", source = "source")
  ConsultationViews.Division toView(DivisionDetail source);

  /**
   * Produces the owned division artwork route only when an image exists.
   *
   * @param source selected current division metadata
   * @return the stable public route, or null when no artwork is configured
   */
  static String toLogoUrl(DivisionDetail source) {
    return source.hasLogo() ? "/divisions/" + source.id() + "/logo" : null;
  }

  /**
   * Combines accepted classification and already selected division metadata.
   *
   * @param source accepted classification with independently unknown format/gender
   * @param division current division metadata
   * @return typed public classification without inferred values
   */
  @Mapping(target = "division", source = "division")
  ConsultationViews.Classification toView(SportingClassification source, DivisionDetail division);

  /**
   * Projects a reliable municipality pair whose completeness was checked by the owner.
   *
   * @param source authorized complete point
   * @return paired point with its current city label
   */
  @Mapping(target = "label", source = "city")
  ConsultationViews.Location toView(SportingPresentation.Locality source);

  /**
   * Projects only effective permitted contact values; missing keys retain absence.
   *
   * @param source already authorized independent contact fields
   * @return public contacts without manual/source fallback
   */
  default ConsultationViews.Contacts toView(Map<ContactField, String> source) {
    return new ConsultationViews.Contacts(
        source.get(ContactField.ADDRESS),
        source.get(ContactField.CITY),
        source.get(ContactField.POSTAL_CODE),
        source.get(ContactField.EMAIL),
        source.get(ContactField.PHONE),
        UriMapping.toUri(source.get(ContactField.WEBSITE)));
  }

  /**
   * Preserves an absent official result independently of retained observation metadata.
   *
   * @param source accepted official result, or null when no result is available
   * @param observedAt independently accepted observation instant
   * @return current public result, or null without an accepted result
   */
  default ConsultationViews.Result toView(MatchObservation.Result source, Instant observedAt) {
    return source == null
        ? null
        : new ConsultationViews.Result(
            toResultState(source.state()),
            source.homeSets(),
            source.awaySets(),
            source.specialLabel(),
            TemporalMapping.toDate(observedAt));
  }

  /**
   * Translates equivalent contract namespaces by typed enum members.
   *
   * @param source ingestion-owned result finality
   * @return the identical public finality, retaining null
   */
  ResultStateEnum toResultState(
      com.blockout.backend.generated.ingestion.model.ResultStateEnum source);
}
