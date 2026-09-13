package com.blockout.backend.api.sports.api;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.backend.api.user.api.CurrentUserActor;
import com.blockout.backend.api.user.api.generated.FfvbAdministrationApi;
import com.blockout.backend.api.user.api.models.*;
import com.blockout.backend.identity.administration.application.AdministratorAccess;
import com.blockout.backend.sports.administration.application.*;
import com.blockout.shared.model.ApiProblemCodeEnum;
import java.net.URI;
import java.util.*;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RestController;

/** Thin HTTP adapter; every operation checks the current active local administrator. */
@RestController
@RequiredArgsConstructor
public class FfvbAdministrationController implements FfvbAdministrationApi {
  /** Verified native-user extraction. */
  private final CurrentUserActor actors;

  /** Uncached identity-owned local permission check. */
  private final AdministratorAccess administrators;

  /** Reference use cases. */
  private final FfvbAdministration sports;

  /** Generated-contract projection. */
  private final FfvbMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> getFfvbConfiguration() {
    return admin(_ -> ok(mapper.toResponse(sports.configuration())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> replaceFfvbConfiguration(FfvbConfigurationRequest request) {
    return admin(
        actor ->
            result(sports.configure(mapper.toCommand(request), actor), mapper::toResponse, false));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> listSportsDivisions(Integer page, Integer pageSize) {
    return admin(_ -> ok(mapper.toDivisionPage(sports.divisions(page, pageSize))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> createSportsDivision(DivisionRequest request) {
    return admin(
        actor ->
            result(
                sports.createDivision(mapper.toCommand(request), actor), mapper::toResponse, true));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> replaceSportsDivision(UUID divisionId, DivisionRequest request) {
    return admin(
        actor ->
            result(
                sports.replaceDivision(divisionId, mapper.toCommand(request), actor),
                mapper::toResponse,
                false));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> listFfvbMappings(Integer page, Integer pageSize, Boolean mapped) {
    return admin(_ -> ok(mapper.toMappingPage(sports.mappings(page, pageSize, mapped, false))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> replaceFfvbMapping(UUID mappingId, FfvbMappingRequest request) {
    return admin(
        actor ->
            result(
                sports.map(mappingId, mapper.toCommand(request), actor),
                mapper::toResponse,
                false));
  }

  /**
   * Resolves permission before invoking the requested operation.
   *
   * @param operation owner call using the trusted local actor
   * @return operation response, or 403 without a sports call
   */
  private ResponseEntity<?> admin(Function<UUID, ResponseEntity<?>> operation) {
    Optional<UUID> actor = actors.current().flatMap(administrators::find);
    return actor.isPresent()
        ? operation.apply(actor.get())
        : problem(HttpStatus.FORBIDDEN, ApiProblemCodeEnum.ACCESS_DENIED);
  }

  /**
   * Maps expected owner outcomes while retaining creation headers.
   *
   * @param outcome owner result
   * @param mapping mechanical DTO mapping
   * @param created whether this is division creation
   * @return uncacheable success or stable problem
   */
  private <T> ResponseEntity<?> result(
      ReferenceResult<T> outcome, Function<T, ?> mapping, boolean created) {
    return switch (outcome.outcome()) {
      case MISSING -> problem(HttpStatus.NOT_FOUND, ApiProblemCodeEnum.RESOURCE_NOT_FOUND);
      case CONFLICT -> problem(HttpStatus.CONFLICT, ApiProblemCodeEnum.SPORTS_REFERENCE_CONFLICT);
      case INVALID -> problem(HttpStatus.BAD_REQUEST, ApiProblemCodeEnum.INVALID_REQUEST);
      case APPLIED -> {
        Object body = mapping.apply(outcome.value());
        ResponseEntity.BodyBuilder response =
            ResponseEntity.status(created ? HttpStatus.CREATED : HttpStatus.OK)
                .cacheControl(CacheControl.noStore().cachePrivate());
        if (created && body instanceof DivisionResponse division)
          response.location(URI.create("/api/v2/admin/divisions/" + division.getId()));
        yield response.body(body);
      }
    };
  }

  /**
   * Builds the common private local-read response.
   *
   * @param body public generated projection
   * @return a private non-cacheable local read
   */
  static ResponseEntity<?> ok(Object body) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body);
  }

  /**
   * Projects a safe expected failure without dependency diagnostics.
   *
   * @param status HTTP outcome
   * @param code stable generated failure code
   * @return safe non-cacheable problem response
   */
  private static ResponseEntity<?> problem(HttpStatus status, ApiProblemCodeEnum code) {
    return ResponseEntity.status(status)
        .cacheControl(CacheControl.noStore().cachePrivate())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(ApiProblems.create(status, code));
  }
}
