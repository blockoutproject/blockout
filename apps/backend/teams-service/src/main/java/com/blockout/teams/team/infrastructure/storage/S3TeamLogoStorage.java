package com.blockout.teams.team.infrastructure.storage;

import com.blockout.teams.config.AwsS3Properties;
import com.blockout.teams.team.application.TeamLogoStorage;
import com.blockout.teams.team.application.TeamLogoUpload;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@RequiredArgsConstructor
public class S3TeamLogoStorage implements TeamLogoStorage {

    private static final String FOLDER = "teams";

    private final AwsS3Properties properties;
    private S3Client client;

    @PostConstruct
    void init() {
        client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        properties.getCredentials().getAccessKey(), properties.getCredentials().getSecretKey())))
                .build();
    }

    @Override
    public String upload(TeamLogoUpload upload) {
        String key = FOLDER + "/" + UUID.randomUUID() + "-" + upload.filename();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getS3().getBucket())
                .key(key)
                .contentType(upload.contentType())
                .build();
        client.putObject(request, RequestBody.fromBytes(upload.content()));
        return baseUrl() + key;
    }

    @Override
    public void delete(String url) {
        if (!url.startsWith(baseUrl())) {
            return;
        }
        String key = url.substring(baseUrl().length());
        client.deleteObject(builder -> builder.bucket(properties.getS3().getBucket()).key(key));
    }

    private String baseUrl() {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion() + ".amazonaws.com/";
    }
}
