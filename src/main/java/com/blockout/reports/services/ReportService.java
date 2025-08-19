package com.blockout.reports.services;

import com.blockout.reports.models.dto.ReportCreateDTO;
import com.blockout.reports.models.integration.discord.DiscordWebhookMessage;
import com.blockout.reports.models.integration.github.GitHubIssueRequest;
import com.blockout.reports.models.integration.github.GitHubIssueResponse;
import com.blockout.reports.services.builder.GitHubIssuePayloadBuilder;
import com.blockout.reports.services.clients.DiscordClientService;
import com.blockout.reports.services.clients.GitHubClientService;
import com.blockout.reports.services.clients.S3StorageClientService;
import com.blockout.reports.utils.ImageUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);

    private final GitHubClientService githubClient;
    private final DiscordClientService discordClient;
    private final S3StorageClientService s3StorageClient;

    private final GitHubIssuePayloadBuilder payloadBuilder = new GitHubIssuePayloadBuilder();

    /**
     * Flux simple et lisible :
     * 1) Générer un reportKey (UUID) -> répertoire S3 indépendant de GitHub
     * 2) Uploader les images sous reports/{reportKey}/1.ext, 2.ext, ...
     * 3) Créer l’issue GitHub
     * 4) Ajouter les URLs au body de l’issue
     * 5) Notifier Discord (non bloquant)
     */
    public GitHubIssueResponse createReport(ReportCreateDTO dto, List<MultipartFile> images) {
        // 1) Clé indépendante (évite d'attendre le numéro d'issue)
        String reportKey = UUID.randomUUID().toString().replace("-", "");
        logger.info("Start report flow", keyValue("reportKey", reportKey));

        // 2) Upload séquentiel, index 1..n, noms simples "1.ext", "2.ext", ...
        List<String> uploadedUrls = new ArrayList<>();
        if (images != null) {
            int index = 1;
            for (MultipartFile image : images) {
                if (image == null || image.isEmpty())
                    continue;
                ImageUtils.validateImage(image);
                try {
                    String url = s3StorageClient.uploadReportImage(image, reportKey, index++);
                    uploadedUrls.add(url);
                } catch (Exception e) {
                    logger.error("Image upload failed",
                            keyValue("action", "upload_report_image"),
                            keyValue("reportKey", reportKey),
                            keyValue("fileName", image.getOriginalFilename()),
                            keyValue("message", e.getMessage()), e);
                    throw new RuntimeException("Échec de l’upload de l’image");
                }
            }
        }

        // 3) Créer l’issue
        GitHubIssueRequest request = payloadBuilder.toIssue(dto);
        GitHubIssueResponse response = githubClient.createIssue(request);
        int issueNumber = response.getNumber();

        // 4) Ajouter les URLs au body de l’issue + garder une trace dans le DTO
        if (!uploadedUrls.isEmpty()) {
            if (dto.getAttachmentImageUrls() == null || dto.getAttachmentImageUrls().isEmpty()) {
                dto.setAttachmentImageUrls(uploadedUrls);
            } else {
                dto.getAttachmentImageUrls().addAll(uploadedUrls);
            }
            githubClient.appendImagesToIssueBody(issueNumber, uploadedUrls);
        }

        logger.info("Report created as GitHub issue",
                keyValue("action", "create_report"),
                keyValue("issueNumber", issueNumber),
                keyValue("issueUrl", response.getHtmlUrl()),
                keyValue("reportKey", reportKey));

        // 5) Notifier Discord (non bloquante)
        String msg = "🧾 Nouveau report #" + response.getNumber() + " — " + response.getTitle()
                + " → " + response.getHtmlUrl();
        try {
            discordClient.send(DiscordWebhookMessage.builder().content(msg).build());
        } catch (Exception e) {
            logger.warn("Discord notification failed",
                    keyValue("action", "discord_notify"),
                    keyValue("issueNumber", issueNumber),
                    keyValue("message", e.getMessage()));
        }

        return response;
    }
}