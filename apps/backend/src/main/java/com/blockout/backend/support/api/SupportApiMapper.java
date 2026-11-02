package com.blockout.backend.support.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportContextRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.generated.mobile.model.SupportSignInFailureRequest;
import com.blockout.backend.generated.mobile.model.SupportTargetRequest;
import com.blockout.backend.support.application.SupportSubmission;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Detaches validated support declarations and projects complete acceptance without private
 * references.
 */
@Mapper(config = MappingConfiguration.class)
public interface SupportApiMapper {
  /**
   * Maps complete acceptance to the canonical response.
   *
   * @param requestId current send's opaque UUID, only after complete receipt
   * @return generated confirmation without a private repository URL
   */
  @Mapping(target = "requestId", source = "requestId")
  @Mapping(target = "additionalProperties", ignore = true)
  SupportRequestCreatedResponse toDto(UUID requestId);

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
