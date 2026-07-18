package com.blockout.reports.report.infrastructure.github;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.reports.config.GitHubProperties;
import com.blockout.reports.report.application.ReportCommand;
import com.blockout.reports.report.application.ReportIssueTracker;
import com.blockout.reports.report.application.ReportResult;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueBuilder;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Adapts report issue operations to the retained GitHub SDK behavior. */
@Component
@RequiredArgsConstructor
public class GitHubIssueAdapter implements ReportIssueTracker {

    private static final Logger LOGGER = LoggerFactory.getLogger(GitHubIssueAdapter.class);

    private final GitHub gitHub;
    private final GitHubProperties properties;
    private final GitHubIssuePayloadBuilder payloadBuilder;

    /** {@inheritDoc} */
    @Override
    public ReportResult create(ReportCommand command) {
        GitHubIssueDraft request = payloadBuilder.toIssue(command);
        String repositoryName = properties.getOwner() + "/" + properties.getRepo();
        LOGGER.info("Creating GitHub issue", keyValue("repo", repositoryName), keyValue("title", request.title()));

        try {
            GHRepository repository = gitHub.getRepository(repositoryName);
            GHIssueBuilder builder = repository.createIssue(request.title()).body(request.body());
            addLabels(builder, request.labels());

            GHIssue issue = builder.create();
            ReportResult result = new ReportResult(
                    issue.getNumber(),
                    URI.create(issue.getHtmlUrl().toString()),
                    issue.getTitle(),
                    issue.getId(),
                    issue.getState().name());
            LOGGER.info("GitHub issue created",
                    keyValue("issueNumber", result.number()), keyValue("url", result.htmlUrl()));
            return result;
        } catch (Exception exception) {
            LOGGER.error("GitHub issue creation failed",
                    keyValue("owner", properties.getOwner()),
                    keyValue("repo", properties.getRepo()),
                    keyValue("message", exception.getMessage()), exception);
            throw new RuntimeException("GitHub create issue failed", exception);
        }
    }

    /** {@inheritDoc} */
    @Override
    public void appendImages(int issueNumber, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return;
        }
        String repositoryName = properties.getOwner() + "/" + properties.getRepo();
        try {
            GHIssue issue = gitHub.getRepository(repositoryName).getIssue(issueNumber);
            StringBuilder body = new StringBuilder(issue.getBody() == null ? "" : issue.getBody());
            body.append("\n\n## Pièces jointes\n\n");
            for (int index = 0; index < imageUrls.size(); index++) {
                String url = imageUrls.get(index);
                if (url != null && !url.isBlank()) {
                    body.append("![capture-").append(index + 1).append("](").append(url).append(")\n");
                }
            }
            issue.setBody(body.toString());
            LOGGER.info("Issue body updated with image attachments", keyValue("issueNumber", issueNumber));
        } catch (Exception exception) {
            LOGGER.warn("Failed to append images to issue body",
                    keyValue("issueNumber", issueNumber), keyValue("message", exception.getMessage()));
        }
    }

    /** Applies the retained non-blank label behavior. */
    private void addLabels(GHIssueBuilder builder, List<String> labels) {
        if (labels != null) {
            labels.stream().filter(this::notBlank).forEach(builder::label);
        }
    }

    /** Tests one provider string before adding it to the request. */
    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
