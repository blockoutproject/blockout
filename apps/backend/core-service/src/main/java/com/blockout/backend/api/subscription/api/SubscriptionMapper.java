package com.blockout.backend.api.subscription.api;

import com.blockout.backend.api.config.ApiMappingConfiguration;
import com.blockout.backend.api.user.api.models.SubscriptionResponse;
import com.blockout.backend.identity.subscription.application.SubscriptionView;
import com.blockout.backend.identity.subscription.domain.SubscriptionFailure;
import com.blockout.shared.model.ApiProblemCodeEnum;
import org.mapstruct.*;

/** Structural projection; provider failure vocabulary is translated only at transport. */
@Mapper(config = ApiMappingConfiguration.class)
public interface SubscriptionMapper {
  /**
   * Projects local evidence without customer identifiers.
   *
   * @param view owner consultation result
   * @return generated subscription response
   */
  @Mapping(target = "errorCode", source = "failure")
  SubscriptionResponse toResponse(SubscriptionView view);

  /**
   * Translates provider classifications to safe public recovery codes.
   *
   * @param failure optional owner failure
   * @return public code, or null after a successful observation
   */
  default ApiProblemCodeEnum toCode(SubscriptionFailure failure) {
    if (failure == null) return null;
    return failure == SubscriptionFailure.CONFIGURATION
        ? ApiProblemCodeEnum.SUBSCRIPTION_CONFIGURATION_ERROR
        : ApiProblemCodeEnum.SUBSCRIPTION_PROVIDER_UNAVAILABLE;
  }
}
