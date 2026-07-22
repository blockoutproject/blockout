package com.blockout.reports.report.infrastructure.providers.github;

import com.blockout.reports.config.GitHubProperties;
import com.blockout.reports.report.application.ports.IssueProvider;
import com.blockout.reports.report.application.views.IssueDraft;
import com.blockout.reports.report.application.views.ReportView;

import lombok.RequiredArgsConstructor;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueBuilder;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class GitHubIssueProvider implements IssueProvider {

    private static final Logger logger = LoggerFactory.getLogger(GitHubIssueProvider.class);

    private final GitHub gitHub;
    private final GitHubProperties props;

    /** {@inheritDoc} */
    @Override
    public ReportView create(IssueDraft request) {
        String fullRepo = props.getOwner() + "/" + props.getRepo();
        logger.info("Creating GitHub issue", keyValue("repo", fullRepo));

        try {
            GHRepository repo = gitHub.getRepository(fullRepo);

            GHIssueBuilder builder = repo.createIssue(request.title()).body(request.body());

            if (request.labels() != null) {
                for (String label : request.labels()) {
                    if (label != null && !label.isBlank())
                        builder.label(label);
                }
            }

            GHIssue issue = builder.create();
            ReportView result = new ReportView(
                issue.getId(), issue.getNumber(), issue.getHtmlUrl().toString(), issue.getTitle(), issue.getState().name());

            logger.info("GitHub issue created",
                keyValue("issueNumber", result.number()));
            return result;

        } catch (Exception e) {
            logger.error("GitHub issue creation failed",
                keyValue("owner", props.getOwner()),
                keyValue("repo", props.getRepo()),
                e);
            throw new RuntimeException("GitHub create issue failed", e);
        }
    }

    /** {@inheritDoc} */
    @Override
    public void appendImages(int issueNumber, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty())
            return;

        String fullRepo = props.getOwner() + "/" + props.getRepo();
        try {
            GHRepository repo = gitHub.getRepository(fullRepo);
            GHIssue issue = repo.getIssue(issueNumber);

            String current = issue.getBody();
            StringBuilder sb = new StringBuilder(current == null ? "" : current);

            sb.append("\n\n## Pièces jointes\n\n");
            for (int i = 0; i < imageUrls.size(); i++) {
                String url = imageUrls.get(i);
                if (url != null && !url.isBlank()) {
                    sb.append("![capture-").append(i + 1).append("](").append(url).append(")\n");
                }
            }

            issue.setBody(sb.toString());
            logger.info("Issue body updated with image attachments",
                keyValue("issueNumber", issueNumber));

        } catch (Exception e) {
            logger.warn("Failed to append images to issue body",
                keyValue("issueNumber", issueNumber),
                e);
        }
    }
}
