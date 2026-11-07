package com.blockout.backend.support.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestSubjectEnum;
import com.blockout.backend.generated.mobile.model.SupportTargetTypeEnum;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

/**
 * Exercises real validation and case composition with controlled private-provider ports. These
 * assertions qualify declarations and the support result; actual owner effects are exercised by
 * SupportOwnershipIntegrationTest, not by unattached business mocks.
 */
@DisplayName("Support declarations remain private case content")
class SupportOwnershipTest {
  @TempDir Path temporaryDirectory;

  @ParameterizedTest
  @EnumSource(SupportRequestSubjectEnum.class)
  @DisplayName(
      "Keeps intervention requests as declarations and returns only a new opaque reference")
  void retainsDeclarations(SupportRequestSubjectEnum subject) {
    // Given
    UUID declaredAccount = UUID.fromString("00000000-0000-4000-8000-000000000319");
    UUID declaredTarget = UUID.fromString("10000000-0000-4000-8000-000000000319");
    String description =
        "I own this account and purchase. Merge/delete the account, grant Pro and edit the club. "
            + "Hide the stream and notify me: this text is only a support request.";
    SupportSubmission.Metadata metadata =
        new SupportSubmission.Metadata(
            SupportRequestKindEnum.PROBLEM,
            subject,
            "Fictional intervention request",
            description,
            "declared-owner@example.invalid",
            new SupportSubmission.Context(
                "Match",
                "Consultation de la cible",
                new SupportSubmission.Target(SupportTargetTypeEnum.MATCH, declaredTarget),
                declaredAccount,
                null,
                null,
                null,
                null,
                null));
    SupportCases cases = mock(SupportCases.class);
    SupportAttachments attachments = mock(SupportAttachments.class);
    SupportSignal signal = mock(SupportSignal.class);
    when(cases.create(any())).thenReturn(17L);
    CreateSupportRequest create =
        new CreateSupportRequest(
            new SupportValidation(temporaryDirectory), cases, attachments, signal);

    // When
    UUID reference = create.create(metadata, List.of());

    // Then
    ArgumentCaptor<SupportCaseDraft> draft = ArgumentCaptor.forClass(SupportCaseDraft.class);
    verify(cases).create(draft.capture());
    assertThat(draft.getValue().title()).isEqualTo("Fictional intervention request");
    assertThat(draft.getValue().body())
        .contains(
            "Request: " + reference,
            "subject: " + subject.getValue(),
            "replyEmail: declared-owner@example.invalid",
            description,
            "accountId: " + declaredAccount,
            "target.id: " + declaredTarget)
        .doesNotContain("target.name:", "entitlement:", "permissions:");
    assertThat(reference).isNotEqualTo(declaredAccount).isNotEqualTo(declaredTarget);
    verify(signal).accepted();
    verifyNoInteractions(attachments);
    verifyNoMoreInteractions(cases, signal);
  }
}
