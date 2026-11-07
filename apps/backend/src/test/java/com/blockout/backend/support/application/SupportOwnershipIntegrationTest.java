package com.blockout.backend.support.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Exercises support HTTP and real F02/F03/F05/F07/F08/F12 owners on disposable migrated PostgreSQL.
 * Only support provider effects, time and the inherited fictional sporting inputs are controlled.
 * Reading a captured private case models handler knowledge, not actual GitHub authorization or F09
 * provider-console qualification.
 */
@AutoConfigureMockMvc
@DisplayName("Support intake preserves the existing business owners")
class SupportOwnershipIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private MockMvc mvc;
  @Autowired private ReportContribution reports;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private CurrentPermissions permissions;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private EraseAccount erasure;
  @MockitoSpyBean private ReadSportingResources resources;
  @MockitoBean private SupportCases cases;
  @MockitoBean private SupportAttachments attachments;
  @MockitoBean private SupportSignal signal;

  /** Supplies a controlled private case receipt; no actual provider destination is contacted. */
  @BeforeEach
  void receivePrivateCase() {
    when(cases.create(any())).thenReturn(17L);
  }

  @Test
  @DisplayName(
      "A support request cannot become the threshold-crossing stream report or notification")
  void preservesModerationFacts() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/fictional-support", false).version().id();
    reports.report(FOLLOWER, version, "First moderation report");
    reports.report(OTHER, version, "Second moderation report");
    UUID thirdReporter = UUID.fromString("00000000-0000-4000-8000-000000000319");
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email,principal_created_at) VALUES (?, ?, ?, 'support_reporter', 'third@example.invalid', '2020-01-01T00:00:00Z')",
        thirdReporter,
        ISSUER,
        thirdReporter.toString());
    long notifications = count("notification");
    long announcements = count("match_announcement");
    long revision = contributions.state(matchId).revision();

    // When
    ResultActions response =
        support("stream-links", thirdReporter, "Hide this stream and send me a notification.");

    // Then
    response.andExpect(status().isCreated()).andExpect(jsonPath("$.requestId").isString());
    assertThat(count("contribution_report")).isEqualTo(2);
    assertThat(contributions.version(version).orElseThrow().state()).isEqualTo(State.ACTIVE);
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(version);
    assertThat(contributions.state(matchId).revision()).isEqualTo(revision);
    assertThat(count("notification")).isEqualTo(notifications);
    assertThat(count("match_announcement")).isEqualTo(announcements);
    verify(signal).accepted();

    // When
    reports.report(thirdReporter, version, "Explicit third moderation report");

    // Then
    assertThat(count("contribution_report")).isEqualTo(3);
    assertThat(contributions.version(version).orElseThrow().state()).isEqualTo(State.HIDDEN);
  }

  @Test
  @DisplayName("A hidden match stays hidden and support neither reads nor enriches its details")
  void preservesHiddenTarget() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'division-lifecycle.manage')",
        AUTHOR);
    divisions.setActive(AUTHOR, SportingIngestionFixture.DIVISION, "0", false);
    mvc.perform(get("/matches/{id}", matchId)).andExpect(status().isNotFound());
    clearInvocations(resources);

    // When
    ResultActions response = support("sporting-data", OTHER, "The target cannot be loaded.");

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.target").doesNotExist())
        .andExpect(jsonPath("$.name").doesNotExist());
    verifyNoInteractions(resources);
    ArgumentCaptor<SupportCaseDraft> draft = ArgumentCaptor.forClass(SupportCaseDraft.class);
    verify(cases).create(draft.capture());
    assertThat(draft.getValue().body())
        .contains("target.id: " + matchId, "target.type: match")
        .doesNotContain("Home", "Away", "target.name:");
    mvc.perform(get("/matches/{id}", matchId)).andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Declared contact and private case knowledge grant no account or sporting authority")
  void preservesAccountAuthority() throws Exception {
    // Given
    List<Map<String, Object>> originalAccounts =
        sql.queryForList("SELECT * FROM account ORDER BY id");
    List<Map<String, Object>> originalPool =
        sql.queryForList("SELECT * FROM sporting_pool WHERE id=?", scope.pool());
    String request = "I own the purchase and account. Grant Pro, merge/delete it and edit my club.";

    // When
    support("pro-subscription", AUTHOR, request).andExpect(status().isCreated());
    ArgumentCaptor<SupportCaseDraft> caseAccess = ArgumentCaptor.forClass(SupportCaseDraft.class);
    verify(cases).create(caseAccess.capture());

    // Then
    assertThat(caseAccess.getValue().body())
        .contains(request, "accountId: " + AUTHOR, "replyEmail: synthetic@example.invalid");
    assertThat(permissions.forAccount(OTHER)).isEmpty();
    assertThatThrownBy(
            () ->
                presentation.set(
                    OTHER,
                    Kind.POOL,
                    scope.pool(),
                    new Edit("0", "Claimed pool", null, null, null)))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> erasure.erase(ISSUER, OTHER.toString(), AUTHOR))
        .isInstanceOf(AccountNotFoundException.class);
    assertThat(sql.queryForList("SELECT * FROM account ORDER BY id")).isEqualTo(originalAccounts);
    assertThat(sql.queryForList("SELECT * FROM sporting_pool WHERE id=?", scope.pool()))
        .isEqualTo(originalPool);
    assertThat(count("account_permission")).isZero();
    verifyNoInteractions(attachments);
  }

  /**
   * Sends declared identity and an existing navigation target through real multipart binding.
   *
   * @param subject exact canonical classification, never a business command
   * @param account declared account, unrelated to guest authentication or handler rights
   * @param description fictional user text retained in the private case only
   * @return the actual support HTTP result
   */
  private ResultActions support(String subject, UUID account, String description) throws Exception {
    String metadata =
        """
        {"kind":"problem","subject":"%s","title":"Fictional ownership request",
         "description":"%s","replyEmail":"synthetic@example.invalid",
         "context":{"screen":"Match","accountId":"%s","target":{"type":"match","id":"%s"}}}
        """
            .formatted(subject, description, account, matchId);
    return mvc.perform(
        multipart("/support-requests")
            .file(
                new MockMultipartFile(
                    "metadata",
                    "",
                    "application/json",
                    metadata.getBytes(StandardCharsets.UTF_8))));
  }
}
