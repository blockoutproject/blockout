package com.blockout.backend.sporting.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.ClubDetailsInternalRequest;
import com.blockout.backend.generated.ingestion.model.ClubLocalityObservationInternalRequest;
import com.blockout.backend.generated.mobile.model.ClubContactsResponse;
import com.blockout.backend.generated.mobile.model.ContactFieldRequest;
import com.blockout.backend.generated.mobile.model.ContactFieldResponse;
import com.blockout.backend.generated.mobile.model.LogoPresentationResponse;
import com.blockout.backend.generated.mobile.model.NamePresentationResponse;
import com.blockout.backend.generated.mobile.model.PoolPresentationResponse;
import com.blockout.backend.generated.mobile.model.SetClubContactsRequest;
import com.blockout.backend.generated.mobile.model.SetClubPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetDivisionPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetPoolPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetTeamPresentationRequest;
import com.blockout.backend.generated.mobile.model.SportingPresentationResponse;
import com.blockout.backend.generated.mobile.model.SportingResourceKindEnum;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import java.util.EnumMap;
import java.util.Map;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;
import org.openapitools.jackson.nullable.JsonNullable;

/** Generated presentation adaptation with native nullable presence preserved before decisions. */
@Mapper(config = MappingConfiguration.class, uses = SportingObservationMapper.class)
public interface SportingPresentationMapper {
  /**
   * Maps complete club metadata and independently validated image content.
   *
   * @param metadata generated complete request, including explicit null manualName
   * @param image decoded replacement, or null
   * @return application command without generated objects
   */
  @Mapping(target = "manualShortName", ignore = true)
  @Mapping(target = "image", source = "image")
  SportingPresentation.Edit toEdit(
      SetClubPresentationRequest metadata, SportingPresentation.Image image);

  /**
   * Maps independent team-name fields and the complete artwork instruction.
   *
   * @param metadata complete generated metadata
   * @param image decoded optional replacement
   * @return complete desired state
   */
  @Mapping(target = "image", source = "image")
  SportingPresentation.Edit toEdit(
      SetTeamPresentationRequest metadata, SportingPresentation.Image image);

  /**
   * Maps a full JSON replacement without adding any pool artwork concept.
   *
   * @param metadata complete names-only request
   * @return complete name command
   */
  @Mapping(target = "logoAction", ignore = true)
  @Mapping(target = "image", ignore = true)
  SportingPresentation.Edit toEdit(SetPoolPresentationRequest metadata);

  /**
   * Maps division presentation independently from its activity.
   *
   * @param metadata complete name/colors/action
   * @param image validated replacement
   * @return complete desired presentation
   */
  @Mapping(target = "image", source = "image")
  SportingPresentation.DivisionEdit toEdit(
      SetDivisionPresentationRequest metadata, SportingPresentation.Image image);

  /**
   * Unwraps required nullable metadata only after generated binding has checked its presence.
   *
   * @param value present generated nullable scalar
   * @return explicit null or supplied value
   */
  default <T> T unwrap(JsonNullable<T> value) {
    return value.get();
  }

  /**
   * Produces required explicit nulls for source/full names and preserves optional short fields.
   *
   * @param names detached current values
   * @return generated response with no omitted required nullable field
   */
  default NamePresentationResponse toResponse(SportingPresentation.Names names) {
    NamePresentationResponse response =
        new NamePresentationResponse(names.sourceName(), names.effectiveName(), names.manualName());
    if (names.effectiveShortName() != null)
      response
          .effectiveShortName(names.effectiveShortName())
          .manualShortName(names.manualShortName());
    return response;
  }

  /**
   * Maps image references without transporting stored bytes through JSON.
   *
   * @param source current artwork selection
   * @return generated required-null response
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "effectiveUrl",
      source = "effectiveUrl",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "manualUrl",
      source = "manualUrl",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "automaticUrl",
      source = "automaticUrl",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  LogoPresentationResponse toResponse(SportingPresentation.Logo source);

  /**
   * Wraps response nulls as explicit present values.
   *
   * @param value current nullable scalar
   * @return native generated nullable representation
   */
  default JsonNullable<String> nullable(String value) {
    return JsonNullable.of(value);
  }

  /**
   * Maps current club/team editor values with the resource's exact generated kind.
   *
   * @param source current detached view
   * @return generated administrative representation
   */
  default SportingPresentationResponse toResponse(SportingPresentation.View source) {
    return new SportingPresentationResponse(
        source.id(),
        SportingResourceKindEnum.fromValue(source.kind().name().toLowerCase(java.util.Locale.ROOT)),
        source.revision(),
        toResponse(source.names()),
        toResponse(source.logo()));
  }

  /**
   * Maps the names-only pool projection using its canonical distinct shape.
   *
   * @param source current pool view
   * @return generated pool editor state
   */
  default PoolPresentationResponse toPoolResponse(SportingPresentation.View source) {
    return new PoolPresentationResponse(source.id(), source.revision(), toResponse(source.names()));
  }

  /**
   * Maps one supplied mode; field-dependent meaning is decided by the application owner.
   *
   * @param source one non-null supplied field object
   * @return independent desired mode and value
   */
  SportingPresentation.ContactEdit toEdit(ContactFieldRequest source);

  /**
   * Preserves omission rather than filling absent contact fields with a default mode.
   *
   * @param request generated JSON patch
   * @return supplied field changes only
   */
  default Map<ContactField, SportingPresentation.ContactEdit> toEdits(
      SetClubContactsRequest request) {
    Map<ContactField, SportingPresentation.ContactEdit> result = new EnumMap<>(ContactField.class);
    add(result, ContactField.ADDRESS, request.getAddress());
    add(result, ContactField.CITY, request.getCity());
    add(result, ContactField.POSTAL_CODE, request.getPostalCode());
    add(result, ContactField.EMAIL, request.getEmail());
    add(result, ContactField.PHONE, request.getPhone());
    add(result, ContactField.WEBSITE, request.getWebsite());
    return Map.copyOf(result);
  }

  /**
   * Adds only a present field; explicit null is already refused by generated JSON binding.
   *
   * @param target supplied changes
   * @param field exact owner field
   * @param request present object, or null when omitted
   */
  private void add(
      Map<ContactField, SportingPresentation.ContactEdit> target,
      ContactField field,
      ContactFieldRequest request) {
    if (request != null) target.put(field, toEdit(request));
  }

  /**
   * Applies restriction before constructing any administrative contact representation.
   *
   * @param field current owner state, already stripped of forbidden stored values
   * @return generated current mode and permitted values
   */
  default ContactFieldResponse toResponse(SportingPresentation.ContactValue field) {
    return new ContactFieldResponse(
        field.mode(),
        field.effectiveValue(),
        field.restricted() ? null : field.sourceValue(),
        field.restricted() ? null : field.manualValue());
  }

  /**
   * Aggregates the six independent fields into their generated owner projection.
   *
   * @param source current club contacts
   * @return complete required-null representation without contact history
   */
  default ClubContactsResponse toResponse(SportingPresentation.Contacts source) {
    return new ClubContactsResponse(
        source.clubId(),
        Long.toString(source.revision()),
        toResponse(source.fields().get(ContactField.ADDRESS)),
        toResponse(source.fields().get(ContactField.CITY)),
        toResponse(source.fields().get(ContactField.POSTAL_CODE)),
        toResponse(source.fields().get(ContactField.EMAIL)),
        toResponse(source.fields().get(ContactField.PHONE)),
        toResponse(source.fields().get(ContactField.WEBSITE)));
  }

  /**
   * Preserves each source field's undefined/null/value state in the application proposal map.
   *
   * @param source generated source page request
   * @return immutable proposal without generated transport objects
   */
  @Mapping(target = "fields", expression = "java(contactProposals(source))")
  SportingPresentation.ClubObservation toObservation(ClubDetailsInternalRequest source);

  /**
   * Collects source field proposals without unwrapping undefined or explicit null.
   *
   * @param source generated club detail request
   * @return all six native nullable proposals
   */
  default Map<ContactField, JsonNullable<String>> contactProposals(
      ClubDetailsInternalRequest source) {
    return Map.of(
        ContactField.ADDRESS,
        source.getAddress(),
        ContactField.CITY,
        source.getCity(),
        ContactField.POSTAL_CODE,
        source.getPostalCode(),
        ContactField.EMAIL,
        source.getEmail(),
        ContactField.PHONE,
        source.getPhone(),
        ContactField.WEBSITE,
        source.getWebsite());
  }

  /**
   * Maps a current-revision geocoding result without moving provider attempt ownership.
   *
   * @param source generated qualified result
   * @return immutable paired-coordinate proposal
   */
  SportingPresentation.LocalityObservation toObservation(
      ClubLocalityObservationInternalRequest source);
}
