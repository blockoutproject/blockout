package com.blockout.reports.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.shared.model.ReportTypeEnum;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies report side-effect order, validation, and retained partial failures. */
@DisplayName("Report submission application service")
class ReportSubmissionApplicationServiceUnitTest {

    /** Proves attachments upload in order before issue creation, append, and notification. */
    @Test
    @DisplayName("preserves the complete side-effect sequence")
    void preservesCompleteSideEffectSequence() {
        RecordingDependencies dependencies = new RecordingDependencies();
        ReportSubmissionApplicationService service = dependencies.service();

        ReportResult result = service.submit(command(), List.of(
                attachment("one.png", "image/png", 4),
                attachment("two.jpg", "image/jpeg", 5)));

        assertThat(result.number()).isEqualTo(42);
        assertThat(dependencies.actions).containsExactly(
                "upload:1:one.png",
                "upload:2:two.jpg",
                "create",
                "append:42:https://cdn.example/1,https://cdn.example/2",
                "notify:42");
    }

    /** Proves null and empty attachments retain their no-op behavior and numbering. */
    @Test
    @DisplayName("skips null and empty attachments")
    void skipsNullAndEmptyAttachments() {
        RecordingDependencies dependencies = new RecordingDependencies();

        dependencies.service().submit(command(), java.util.Arrays.asList(
                null,
                attachment("empty.png", "image/png", 0),
                attachment("kept.png", "image/png", 1)));

        assertThat(dependencies.actions).containsExactly("upload:1:kept.png", "create",
                "append:42:https://cdn.example/1", "notify:42");
    }

    /** Proves declared MIME validation remains before any external side effect. */
    @Test
    @DisplayName("rejects a non PNG or JPEG attachment before side effects")
    void rejectsInvalidMimeBeforeSideEffects() {
        RecordingDependencies dependencies = new RecordingDependencies();

        assertThatThrownBy(() -> dependencies.service().submit(
                command(), List.of(attachment("image.webp", "image/webp", 4))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Seuls les formats PNG et JPEG sont autorisés.");
        assertThat(dependencies.actions).isEmpty();
    }

    /** Proves a later invalid attachment retains earlier committed storage effects. */
    @Test
    @DisplayName("validates each attachment immediately before its upload")
    void validatesEachAttachmentImmediatelyBeforeItsUpload() {
        RecordingDependencies dependencies = new RecordingDependencies();

        assertThatThrownBy(() -> dependencies.service().submit(command(), List.of(
                        attachment("kept.png", "image/png", 4),
                        attachment("invalid.webp", "image/webp", 4))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Seuls les formats PNG et JPEG sont autorisés.");

        assertThat(dependencies.actions).containsExactly("upload:1:kept.png");
    }

    /** Proves the five-megabyte limit remains before storage. */
    @Test
    @DisplayName("rejects an oversized attachment before side effects")
    void rejectsOversizedAttachmentBeforeSideEffects() {
        RecordingDependencies dependencies = new RecordingDependencies();
        ReportAttachment oversized = new ReportAttachment(
                "large.png", "image/png", 5L * 1024 * 1024 + 1, new byte[] {1});

        assertThatThrownBy(() -> dependencies.service().submit(command(), List.of(oversized)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("La taille maximale de l’image est de 5 Mo.");
        assertThat(dependencies.actions).isEmpty();
    }

    /** Proves an upload failure stops issue creation and retains the public failure message. */
    @Test
    @DisplayName("stops after an attachment upload failure")
    void stopsAfterUploadFailure() {
        RecordingDependencies dependencies = new RecordingDependencies();
        dependencies.failUpload = true;

        assertThatThrownBy(() -> dependencies.service().submit(
                command(), List.of(attachment("image.png", "image/png", 4))))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Échec de l’upload de l’image");
        assertThat(dependencies.actions).containsExactly("upload:1:image.png");
    }

    /** Proves Discord remains best effort after the durable issue succeeds. */
    @Test
    @DisplayName("returns success when notification fails")
    void returnsSuccessWhenNotificationFails() {
        RecordingDependencies dependencies = new RecordingDependencies();
        dependencies.failNotification = true;

        ReportResult result = dependencies.service().submit(command(), List.of());

        assertThat(result.number()).isEqualTo(42);
        assertThat(dependencies.actions).containsExactly("create", "notify:42");
    }

    /** Builds one complete canonical command. */
    private ReportCommand command() {
        return new ReportCommand(
                ReportTypeEnum.DATA_ERROR,
                "Wrong score",
                "The score is incorrect",
                "1.2.3",
                12L,
                null,
                "Player",
                "Match",
                "Phone",
                "Android",
                List.of());
    }

    /** Builds one attachment with an explicit audited size. */
    private ReportAttachment attachment(String name, String type, long size) {
        return new ReportAttachment(name, type, size, new byte[] {1});
    }

    /** Records every external effect without requiring vendor SDK mocks. */
    private static final class RecordingDependencies
            implements ReportAttachmentStorage, ReportIssueTracker, ReportNotifier {

        private final List<String> actions = new ArrayList<>();
        private boolean failUpload;
        private boolean failNotification;

        private ReportSubmissionApplicationService service() {
            return new ReportSubmissionApplicationService(this, this, this);
        }

        @Override
        public String upload(ReportSubmissionPlan.AttachmentUpload upload) {
            actions.add("upload:" + upload.index() + ":" + upload.attachment().filename());
            if (failUpload) {
                throw new IllegalStateException("storage unavailable");
            }
            return "https://cdn.example/" + upload.index();
        }

        @Override
        public ReportResult create(ReportCommand command) {
            actions.add("create");
            return new ReportResult(42, URI.create("https://github.example/issues/42"), "Wrong score", 99L, "OPEN");
        }

        @Override
        public void appendImages(int issueNumber, List<String> imageUrls) {
            actions.add("append:" + issueNumber + ":" + String.join(",", imageUrls));
        }

        @Override
        public void notifyCreated(ReportResult result) {
            actions.add("notify:" + result.number());
            if (failNotification) {
                throw new IllegalStateException("webhook unavailable");
            }
        }
    }
}
