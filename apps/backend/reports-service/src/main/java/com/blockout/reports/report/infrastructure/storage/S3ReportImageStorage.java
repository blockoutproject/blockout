package com.blockout.reports.report.infrastructure.storage;

import com.blockout.reports.config.AwsS3Properties;
import com.blockout.reports.report.application.models.ReportAttachment;
import com.blockout.reports.report.application.ports.ReportImageStorage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class S3ReportImageStorage implements ReportImageStorage {

    private final AwsS3Properties s3Properties;
    private S3Client s3Client;

    @PostConstruct
    public void init() {
        this.s3Client = S3Client.builder()
            .region(Region.of(s3Properties.getRegion()))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(
                        s3Properties.getCredentials().getAccessKey(),
                        s3Properties.getCredentials().getSecretKey())))
            .build();
    }

    /**
     * Upload d'une image sous reports/{reportKey}/{index}.{ext}
     * - Nom de fichier simple (1.ext, 2.ext, ...)
     * - Extension déduite du contentType (fallback sur l'original)
     */
    @Override
    public String upload(ReportAttachment file, String reportKey, int index) {
        String ext = resolveExtension(file);
        String key = String.format("reports/%s/%d.%s", reportKey, index, ext);

        PutObjectRequest putRequest = PutObjectRequest.builder()
            .bucket(s3Properties.getS3().getBucket())
            .key(key)
            .contentType(file.contentType())
            .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(file.content()));
        return buildPublicUrl(key);
    }

    /**
     * Option simple pour supprimer un objet via son URL publique.
     */
    public void deleteObjectByUrl(String url) {
        String baseUrl = "https://" + s3Properties.getS3().getBucket() +
            ".s3." + s3Properties.getRegion() + ".amazonaws.com/";
        if (!url.startsWith(baseUrl))
            return;

        String key = url.substring(baseUrl.length());
        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(s3Properties.getS3().getBucket())
            .key(key)
            .build());
    }

    private String buildPublicUrl(String key) {
        return "https://" + s3Properties.getS3().getBucket() +
            ".s3." + s3Properties.getRegion() +
            ".amazonaws.com/" + key;
    }

    /**
     * Déduit une extension courte à partir du contentType, sinon l'originale, sinon
     * "bin".
     */
    private String resolveExtension(ReportAttachment file) {
        String ct = file.contentType();
        if (ct != null) {
            ct = ct.toLowerCase(Locale.ROOT);
            switch (ct) {
                case "image/jpeg":
                case "image/jpg":
                    return "jpg";
                case "image/png":
                    return "png";
                case "image/webp":
                    return "webp";
                case "image/gif":
                    return "gif";
            }
        }
        String name = file.originalFilename();
        if (name != null) {
            int dot = name.lastIndexOf('.');
            if (dot >= 0 && dot < name.length() - 1) {
                return name.substring(dot + 1).toLowerCase(Locale.ROOT);
            }
        }
        return "bin";
    }
}
