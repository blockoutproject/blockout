package com.blockout.backend.shared.image;

import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ImageStorageProperties.class)
class ImageStorageConfiguration {
  @Bean
  S3Client imageS3Client(ImageStorageProperties properties) {
    return S3Client.builder()
        .region(Region.of(properties.region()))
        .crossRegionAccessEnabled(true)
        .overrideConfiguration(
            config ->
                config
                    .apiCallAttemptTimeout(Duration.ofSeconds(4))
                    .apiCallTimeout(Duration.ofSeconds(10)))
        .build();
  }
}
