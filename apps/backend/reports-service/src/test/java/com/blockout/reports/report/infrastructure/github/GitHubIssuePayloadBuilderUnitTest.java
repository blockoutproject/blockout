package com.blockout.reports.report.infrastructure.github;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.report.application.ReportCommand;
import com.blockout.shared.model.ReportTypeEnum;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies the retained GitHub label and Markdown projection. */
@DisplayName("GitHub issue payload builder")
class GitHubIssuePayloadBuilderUnitTest {

    /** Proves current context labels, legacy URLs, and description formatting remain intact. */
    @Test
    @DisplayName("builds the retained provider payload")
    void buildsRetainedProviderPayload() {
        ReportCommand command = new ReportCommand(
                ReportTypeEnum.DISPLAY_BUG,
                "Broken layout",
                "The button overlaps",
                "1.2.3",
                null,
                "auth0|legacy",
                "Player",
                "Profile",
                "Phone",
                "Android",
                List.of("https://legacy/image.png"));

        var request = new GitHubIssuePayloadBuilder().toIssue(command);

        assertThat(request.labels()).containsExactly("display bug");
        assertThat(request.title()).isEqualTo("Broken layout");
        assertThat(request.body())
                .contains("- **ID Utilisateur**: auth0|legacy")
                .contains("## Description\nThe button overlaps")
                .contains("![screenshot](https://legacy/image.png)");
    }
}
