package com.blockout.reports.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.ReportTypeEnum;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReportSubmissionPlanUnitTest {

    @Test
    void snapshotsNonEmptyAttachmentsWithStableOneBasedIndexes() {
        ReportAttachment first = new ReportAttachment("first.png", "image/png", 1, new byte[] {1});
        ReportAttachment second = new ReportAttachment("second.jpg", "image/jpeg", 1, new byte[] {2});
        List<ReportAttachment> submitted = new ArrayList<>();
        submitted.add(first);
        submitted.add(null);
        submitted.add(new ReportAttachment("empty.png", "image/png", 0, new byte[0]));
        submitted.add(second);

        ReportSubmissionPlan plan = ReportSubmissionPlan.create(command(), submitted, "report-key");
        submitted.clear();

        assertThat(plan.reportKey()).isEqualTo("report-key");
        assertThat(plan.attachmentUploads())
                .extracting(ReportSubmissionPlan.AttachmentUpload::index)
                .containsExactly(1, 2);
        assertThat(plan.attachmentUploads())
                .extracting(upload -> upload.attachment().filename())
                .containsExactly("first.png", "second.jpg");
    }

    private ReportCommand command() {
        return new ReportCommand(
                ReportTypeEnum.OTHER,
                "Title",
                "Description",
                "1.2.3",
                12L,
                null,
                null,
                null,
                null,
                null,
                List.of());
    }
}
