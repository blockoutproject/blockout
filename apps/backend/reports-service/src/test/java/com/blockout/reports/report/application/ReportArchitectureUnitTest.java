package com.blockout.reports.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.report.infrastructure.discord.DiscordHttpConfiguration;
import com.blockout.reports.report.infrastructure.discord.DiscordReportNotifier;
import com.blockout.reports.report.infrastructure.github.GitHubClientConfiguration;
import com.blockout.reports.report.infrastructure.github.GitHubIssueAdapter;
import com.blockout.reports.report.infrastructure.github.GitHubIssueDraft;
import com.blockout.reports.report.infrastructure.storage.S3ReportAttachmentStorage;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

class ReportArchitectureUnitTest {

    @Test
    void applicationFlowDependsOnlyOnReportOwnedPortsAndRoles() {
        assertThat(Arrays.stream(ReportSubmissionApplicationService.class.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch("com.blockout.reports.report.application"::equals);
    }

    @Test
    void providerAdaptersExposeOnlyApplicationPorts() {
        assertThat(S3ReportAttachmentStorage.class.getInterfaces()).containsExactly(ReportAttachmentStorage.class);
        assertThat(GitHubIssueAdapter.class.getInterfaces()).containsExactly(ReportIssueTracker.class);
        assertThat(DiscordReportNotifier.class.getInterfaces()).containsExactly(ReportNotifier.class);
        assertThat(GitHubClientConfiguration.class.getPackageName())
                .isEqualTo("com.blockout.reports.report.infrastructure.github");
    }

    @Test
    void providerDraftAndDiscordClientKeepOnlyTheirRequiredSurface() {
        assertThat(Arrays.stream(GitHubIssueDraft.class.getRecordComponents())
                .map(component -> component.getName()))
                .containsExactly("title", "body", "labels");
        assertThat(new DiscordHttpConfiguration()
                        .discordRestTemplate(new RestTemplateBuilder())
                        .getInterceptors())
                .isEmpty();
    }
}
