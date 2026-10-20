package com.blockout.backend.support.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportContextRequest;
import com.blockout.backend.generated.mobile.model.SupportPlatformEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestSubjectEnum;
import com.blockout.backend.generated.mobile.model.SupportSignInFailureRequest;
import com.blockout.backend.generated.mobile.model.SupportTargetRequest;
import com.blockout.backend.generated.mobile.model.SupportTargetTypeEnum;
import com.blockout.backend.support.application.SupportSubmission;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Proves real MapStruct output detaches every allowed declaration without granting authority. */
@DisplayName("Support input mapping")
class SupportInputMapperTest {
  @Test
  @DisplayName("Copies all declared metadata into an immutable snapshot")
  void mapsDeclaredContext() {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    SupportContextRequest context =
        new SupportContextRequest()
            .screen("match")
            .action("load")
            .target(new SupportTargetRequest(SupportTargetTypeEnum.MATCH, id))
            .accountId(id)
            .appVersion("1.0.0")
            .platform(SupportPlatformEnum.IOS)
            .osVersion("27")
            .deviceModel("synthetic")
            .signInFailure(
                new SupportSignInFailureRequest()
                    .method("email")
                    .stage("callback")
                    .reason("denied")
                    .reference("fixture"));
    SubmitSupportRequest request =
        new SubmitSupportRequest(
                SupportRequestKindEnum.SUGGESTION,
                "A useful title",
                "Keep this description",
                "fiction@example.invalid",
                context)
            .subject(SupportRequestSubjectEnum.SPORTING_DATA);
    SupportInputMapper mapper = Mappers.getMapper(SupportInputMapper.class);

    // When
    SupportSubmission.Metadata result = mapper.toMetadata(request);
    context.setScreen("changed after mapping");
    context.getTarget().setId(UUID.randomUUID());
    context.getSignInFailure().setReason("changed");

    // Then
    assertThat(result)
        .isEqualTo(
            new SupportSubmission.Metadata(
                SupportRequestKindEnum.SUGGESTION,
                SupportRequestSubjectEnum.SPORTING_DATA,
                "A useful title",
                "Keep this description",
                "fiction@example.invalid",
                new SupportSubmission.Context(
                    "match",
                    "load",
                    new SupportSubmission.Target(SupportTargetTypeEnum.MATCH, id),
                    id,
                    "1.0.0",
                    SupportPlatformEnum.IOS,
                    "27",
                    "synthetic",
                    new SupportSubmission.SignInFailure(
                        "email", "callback", "denied", "fixture"))));
  }

  @Test
  @DisplayName("Keeps optional subject and unknown context facts absent")
  void preservesAbsence() {
    // Given
    SubmitSupportRequest request =
        new SubmitSupportRequest(
            SupportRequestKindEnum.PROBLEM,
            "Title",
            "Description",
            "fiction@example.invalid",
            new SupportContextRequest());
    SupportInputMapper mapper = Mappers.getMapper(SupportInputMapper.class);

    // When
    SupportSubmission.Metadata result = mapper.toMetadata(request);

    // Then
    assertThat(result.subject()).isNull();
    assertThat(result.context())
        .isEqualTo(
            new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));
  }
}
