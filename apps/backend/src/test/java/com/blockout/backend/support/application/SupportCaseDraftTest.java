package com.blockout.backend.support.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.SupportPlatformEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestSubjectEnum;
import com.blockout.backend.generated.mobile.model.SupportTargetTypeEnum;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Private composition keeps canonical declarations without any business lookup or truncation. */
@DisplayName("Private support case composition")
class SupportCaseDraftTest {
  @Test
  @DisplayName("Preserves maximum Unicode content and every known contextual declaration")
  void preservesAllKnownContent() {
    // Given
    UUID requestId = UUID.fromString("00000000-0000-4000-8000-000000000299");
    UUID targetId = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID accountId = UUID.fromString("00000000-0000-4000-8000-000000000002");
    String maximumTitle = "🏐".repeat(100);
    String maximumDescription = "🏐".repeat(5_000);
    String maximumContext = "🏐".repeat(128);
    SupportSubmission.Metadata metadata =
        new SupportSubmission.Metadata(
            SupportRequestKindEnum.PROBLEM,
            SupportRequestSubjectEnum.ACCOUNT,
            maximumTitle,
            maximumDescription,
            "fiction@example.invalid",
            new SupportSubmission.Context(
                maximumContext,
                "restore",
                new SupportSubmission.Target(SupportTargetTypeEnum.MATCH, targetId),
                accountId,
                "0.0.0",
                SupportPlatformEnum.IOS,
                "27",
                "Fictional device",
                new SupportSubmission.SignInFailure(
                    "apple", "login", "cancelled", "fictional-reference")));
    SupportSubmission submission = new SupportSubmission(requestId, metadata, List.of(), null);

    // When
    SupportCaseDraft draft = SupportCaseDraft.from(submission);

    // Then
    assertThat(draft.title()).isEqualTo(maximumTitle);
    assertThat(draft.body())
        .contains(
            maximumDescription,
            "screen: " + maximumContext,
            "Request: " + requestId,
            "kind: problem",
            "subject: account",
            "replyEmail: fiction@example.invalid",
            "target.type: match",
            "target.id: " + targetId,
            "accountId: " + accountId,
            "action: restore",
            "appVersion: 0.0.0",
            "platform: ios",
            "osVersion: 27",
            "deviceModel: Fictional device",
            "signInFailure.method: apple",
            "signInFailure.stage: login",
            "signInFailure.reason: cancelled",
            "signInFailure.reference: fictional-reference");
  }
}
