package com.blockout.reports.services.clients;

import com.blockout.reports.config.GitHubProperties;
import com.blockout.reports.models.dto.github.GitHubIssueRequestDTO;
import com.blockout.reports.models.dto.github.GitHubIssueResponseDTO;

import lombok.RequiredArgsConstructor;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueBuilder;
import org.kohsuke.github.GHMilestone;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class GitHubClientService {

    private static final Logger logger = LoggerFactory.getLogger(GitHubClientService.class);

    private final GitHub gitHub;
    private final GitHubProperties props;

    /** Crée une issue GitHub (sans modifier le titre). */
    public GitHubIssueResponseDTO createIssue(GitHubIssueRequestDTO req) {
        String fullRepo = props.getOwner() + "/" + props.getRepo();
        logger.info("Creating GitHub issue", keyValue("repo", fullRepo), keyValue("title", req.getTitle()));

        try {
            GHRepository repo = gitHub.getRepository(fullRepo);

            GHIssueBuilder builder = repo.createIssue(req.getTitle()).body(req.getBody());

            if (req.getLabels() != null) {
                for (String label : req.getLabels()) {
                    if (label != null && !label.isBlank())
                        builder.label(label);
                }
            }

            if (req.getAssignees() != null) {
                for (String assignee : req.getAssignees()) {
                    if (assignee != null && !assignee.isBlank())
                        builder.assignee(assignee);
                }
            }

            if (req.getMilestone() != null) {
                GHMilestone milestone = repo.getMilestone(req.getMilestone());
                if (milestone != null)
                    builder.milestone(milestone);
            }

            GHIssue issue = builder.create();

            GitHubIssueResponseDTO res = new GitHubIssueResponseDTO();
            res.setId(issue.getId());
            res.setNumber(issue.getNumber());
            res.setHtmlUrl(issue.getHtmlUrl().toString());
            res.setTitle(issue.getTitle());
            res.setState(issue.getState().name());

            logger.info("GitHub issue created",
                    keyValue("issueNumber", res.getNumber()),
                    keyValue("url", res.getHtmlUrl()));
            return res;

        } catch (Exception e) {
            logger.error("GitHub issue creation failed",
                    keyValue("owner", props.getOwner()),
                    keyValue("repo", props.getRepo()),
                    keyValue("message", e.getMessage()), e);
            throw new RuntimeException("GitHub create issue failed", e);
        }
    }

    /**
     * Ajoute une section "Pièces jointes" à la fin du body en conservant l'ordre
     * des URLs.
     */
    public void appendImagesToIssueBody(int issueNumber, List<String> imageUrls) {
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
                    keyValue("message", e.getMessage()));
        }
    }
}