package com.blockout.backend.support.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportContextRequest;
import com.blockout.backend.generated.mobile.model.SupportSignInFailureRequest;
import com.blockout.backend.generated.mobile.model.SupportTargetRequest;
import com.blockout.backend.support.application.SupportSubmission;
import org.mapstruct.Mapper;

/** Detaches validated generated DTOs into immutable support values at the transport boundary. */
@Mapper(config = MappingConfiguration.class)
public interface SupportInputMapper {
  /**
   * Copies metadata already normalized during JSON binding and accepted by canonical validation.
   *
   * @param request canonical DTO after Spring binding and Bean Validation
   * @return immutable declarations for the current send attempt
   */
  SupportSubmission.Metadata toMetadata(SubmitSupportRequest request);

  /**
   * Detaches the complete allowlisted context.
   *
   * @param request required allowlisted context, possibly empty
   * @return immutable known facts, retaining absent values
   */
  SupportSubmission.Context toContext(SupportContextRequest request);

  /**
   * Copies a navigation declaration without looking up the resource.
   *
   * @param request optional declared navigation target
   * @return immutable target or null when omitted
   */
  SupportSubmission.Target toTarget(SupportTargetRequest request);

  /**
   * Copies the safe sign-in declaration.
   *
   * @param request optional safe sign-in facts
   * @return immutable facts or null when omitted
   */
  SupportSubmission.SignInFailure toSignInFailure(SupportSignInFailureRequest request);
}
