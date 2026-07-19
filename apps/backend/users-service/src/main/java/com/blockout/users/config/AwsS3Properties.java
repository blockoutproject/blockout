package com.blockout.users.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "aws")
public class AwsS3Properties {

    @NotBlank
    private String region;

    private final Credentials credentials = new Credentials();
    private final S3 s3 = new S3();

    @Data
    public static class Credentials {
        @NotBlank
        private String accessKey;

        @NotBlank
        private String secretKey;
    }

    @Data
    public static class S3 {
        @NotBlank
        private String bucket;
    }
}