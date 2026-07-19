package com.blockout.teams.team.infrastructure.storage;

import com.blockout.teams.config.AwsS3Properties;
import com.blockout.teams.team.application.commands.TeamImageCommand;
import com.blockout.teams.team.application.ports.TeamImageStorage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

/** S3 adapter for Team logo storage. */
@Component
@RequiredArgsConstructor
public class S3TeamImageStorage implements TeamImageStorage {

    private final AwsS3Properties s3Properties;
    private S3Client s3Client;

    @PostConstruct
    void initializeClient() {
        s3Client = S3Client.builder()
                .region(Region.of(s3Properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        s3Properties.getCredentials().getAccessKey(),
                        s3Properties.getCredentials().getSecretKey())))
                .build();
    }

    @Override
    public String uploadTeamImage(TeamImageCommand image) {
        String filename = image.filename() == null || image.filename().isBlank() ? "team-image" : image.filename();
        String key = "teams/" + UUID.randomUUID() + "-" + filename;
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(s3Properties.getS3().getBucket())
                .key(key)
                .contentType(image.contentType())
                .build();
        s3Client.putObject(request, RequestBody.fromBytes(image.content()));
        return baseUrl() + key;
    }

    @Override
    public void deleteTeamImage(String url) {
        if (!url.startsWith(baseUrl())) return;
        String key = url.substring(baseUrl().length());
        s3Client.deleteObject(builder -> builder.bucket(s3Properties.getS3().getBucket()).key(key));
    }

    private String baseUrl() {
        return "https://" + s3Properties.getS3().getBucket() + ".s3."
                + s3Properties.getRegion() + ".amazonaws.com/";
    }
}
