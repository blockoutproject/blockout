package com.blockout.mobilegateway.shared.api.v1;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class LegacyMobileGatewayWebConfiguration implements WebMvcConfigurer {

    private final LegacyMobileGatewayJson legacyJson;

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(0, new LegacyMobileGatewayHttpMessageConverter(legacyJson));
    }
}
