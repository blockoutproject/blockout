package com.blockout.reports.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.report.application.commands.CreateReportCommand;
import com.blockout.reports.report.application.models.ReportAttachment;
import com.blockout.reports.report.application.models.ReportType;
import com.blockout.reports.report.application.ports.IssueProvider;
import com.blockout.reports.report.application.ports.ReportImageStorage;
import com.blockout.reports.report.application.ports.ReportNotifier;
import com.blockout.reports.report.application.views.IssueDraft;
import com.blockout.reports.report.application.views.ReportView;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReportApplicationServiceTest {

    @Test
    void assemblesStorageIssueAndNotificationWithoutExposingProviderModels() {
        RecordingIssueProvider issueProvider = new RecordingIssueProvider();
        List<ReportView> notifications = new ArrayList<>();
        ReportImageStorage storage = (attachment, reportKey, index) -> "https://images.invalid/" + index;
        ReportNotifier notifier = notifications::add;
        ReportApplicationService service = new ReportApplicationService(issueProvider, notifier, storage);
        CreateReportCommand command = new CreateReportCommand(
                ReportType.DISPLAY_BUG, "Broken screen", "Description", "1.0", "user-1", "User", "Feed",
                "iPhone", "iOS", List.of(), List.of(new ReportAttachment("screen.png", "image/png", new byte[] {1})));

        ReportView result = service.createReport(command);

        assertThat(result.number()).isEqualTo(12);
        assertThat(issueProvider.draft.labels()).containsExactly("display bug");
        assertThat(issueProvider.appendedImages).containsExactly("https://images.invalid/1");
        assertThat(notifications).containsExactly(result);
    }

    private static final class RecordingIssueProvider implements IssueProvider {
        private IssueDraft draft;
        private List<String> appendedImages = List.of();

        @Override
        public ReportView create(IssueDraft draft) {
            this.draft = draft;
            return new ReportView(1L, 12, "https://github.invalid/issues/12", draft.title(), "OPEN");
        }

        @Override
        public void appendImages(int issueNumber, List<String> imageUrls) {
            this.appendedImages = List.copyOf(imageUrls);
        }
    }
}
