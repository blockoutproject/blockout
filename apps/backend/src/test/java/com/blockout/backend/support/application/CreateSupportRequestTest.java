package com.blockout.backend.support.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.ClassPathResource;

/**
 * Real whole-input validation and orchestration; only the three provider boundaries are doubles.
 */
@DisplayName("Complete private support receipt")
class CreateSupportRequestTest {
  @TempDir Path temporaryDirectory;
  private final SupportCases cases = mock(SupportCases.class);
  private final SupportAttachments attachments = mock(SupportAttachments.class);
  private final SupportSignal signal = mock(SupportSignal.class);

  @Test
  @DisplayName("Rejects a corrupt later image before any provider effect")
  void validatesAllImagesFirst() throws Exception {
    // Given
    List<byte[]> images = List.of(image(), new byte[] {1, 2, 3});

    // When / Then
    assertThatThrownBy(() -> useCase().create(metadata(), images))
        .isInstanceOf(SupportValidation.InvalidSubmission.class);
    verifyNoInteractions(cases, attachments, signal);
    assertThat(temporaryDirectory).isEmptyDirectory();
  }

  @Test
  @DisplayName("Creates text-only intake complete directly")
  void acceptsTextOnly() {
    // Given
    when(cases.create(any())).thenReturn(17L);

    // When
    UUID requestId = useCase().create(metadata(), List.of());

    // Then
    ArgumentCaptor<SupportCaseDraft> draft = ArgumentCaptor.forClass(SupportCaseDraft.class);
    verify(cases).create(draft.capture());
    assertThat(draft.getValue().complete()).isTrue();
    assertThat(draft.getValue().body())
        .contains(requestId.toString(), "fiction@example.invalid", "Second line", "suggestion")
        .doesNotContain("subject: null", "accountId: null");
    verifyNoInteractions(attachments);
    verify(cases, org.mockito.Mockito.never()).complete(anyLong());
    verify(signal).accepted();
  }

  @Test
  @DisplayName("Attaches all private originals before completing intake and signaling")
  void acceptsAllImages() throws Exception {
    // Given
    List<String> effects = new ArrayList<>();
    List<Path> originals = new ArrayList<>();
    when(cases.create(any()))
        .thenAnswer(
            invocation -> {
              SupportCaseDraft draft = invocation.getArgument(0);
              assertThat(draft.complete()).isFalse();
              effects.add("create-incomplete");
              return 17L;
            });
    doAnswer(
            invocation -> {
              assertThat(invocation.<Long>getArgument(0)).isEqualTo(17L);
              List<SupportSubmission.Image> images = invocation.getArgument(1);
              assertThat(images).hasSize(5);
              for (SupportSubmission.Image image : images) {
                assertThat(Files.readAllBytes(image.path())).isEqualTo(image());
                originals.add(image.path());
              }
              effects.add("attach-all");
              return null;
            })
        .when(attachments)
        .attach(anyLong(), any());
    doAnswer(
            invocation -> {
              effects.add("complete");
              return null;
            })
        .when(cases)
        .complete(17L);
    doAnswer(
            invocation -> {
              effects.add("signal");
              return null;
            })
        .when(signal)
        .accepted();

    // When
    UUID requestId = useCase().create(metadata(), Collections.nCopies(5, image()));

    // Then
    assertThat(requestId).isNotNull();
    assertThat(effects).containsExactly("create-incomplete", "attach-all", "complete", "signal");
    assertThat(originals).allMatch(path -> !Files.exists(path));
  }

  @ParameterizedTest
  @ValueSource(strings = {"create", "attach", "complete"})
  @DisplayName("Refuses unconfirmed intake without a secondary signal or replay")
  void refusesIncompleteIntake(String failedStage) throws Exception {
    // Given
    SupportUnavailableException failure =
        new SupportUnavailableException(
            SupportUnavailableException.Stage.COMPLETE,
            SupportUnavailableException.Reason.UNCONFIRMED);
    if (failedStage.equals("create")) when(cases.create(any())).thenThrow(failure);
    else when(cases.create(any())).thenReturn(17L);
    if (failedStage.equals("attach")) doThrow(failure).when(attachments).attach(anyLong(), any());
    if (failedStage.equals("complete")) doThrow(failure).when(cases).complete(17L);

    // When / Then
    assertThatThrownBy(() -> useCase().create(metadata(), List.of(image()))).isSameAs(failure);
    verify(cases).create(any());
    verifyNoInteractions(signal);
    if (failedStage.equals("create")) verifyNoInteractions(attachments);
    if (!failedStage.equals("complete"))
      verify(cases, org.mockito.Mockito.never()).complete(anyLong());
    assertThat(temporaryDirectory).isEmptyDirectory();
  }

  @Test
  @DisplayName("An explicit new send creates a new case after a lost response")
  void permitsExceptionalDuplicate() {
    // Given
    when(cases.create(any())).thenReturn(17L, 18L);
    CreateSupportRequest create = useCase();

    // When
    UUID lost = create.create(metadata(), List.of());
    UUID retry = create.create(metadata(), List.of());

    // Then
    assertThat(retry).isNotEqualTo(lost);
    verify(cases, org.mockito.Mockito.times(2)).create(any());
    verifyNoInteractions(attachments);
  }

  /** Constructs the real input owner using this test's private temporary directory. */
  private CreateSupportRequest useCase() {
    return new CreateSupportRequest(
        new SupportValidation(temporaryDirectory), cases, attachments, signal);
  }

  /** Fictional metadata already admitted by the canonical HTTP validation boundary. */
  private static SupportSubmission.Metadata metadata() {
    return new SupportSubmission.Metadata(
        SupportRequestKindEnum.SUGGESTION,
        null,
        "Unicode 🏐",
        "First line\nSecond line",
        "fiction@example.invalid",
        new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));
  }

  /** Loads the existing synthetic image; never an actual user attachment. */
  private static byte[] image() throws Exception {
    return new ClassPathResource("support/synthetic.png").getContentAsByteArray();
  }
}
