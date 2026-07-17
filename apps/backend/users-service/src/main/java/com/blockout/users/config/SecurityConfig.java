package com.blockout.users.config;

import com.blockout.users.shared.api.v2.UsersSecurityProblemWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import static org.springframework.security.config.Customizer.withDefaults;

/** Configures retained v1 and canonical v2 users-service authentication boundaries. */
@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {

    private final AuthProperties authProperties;
    private final UsersSecurityProblemWriter securityProblems;

    /** Preserves the exact v1 API-key filter for the deferred identity operation. */
    @Bean
    @Order(1)
    public SecurityFilterChain internalChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/v1/users/internal/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(new ApiKeyFilter(authProperties), UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .build();
    }

    /** Configures bearer authentication and version-aware security responses. */
    @Bean
    @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(securityProblems)
                        .accessDeniedHandler(securityProblems))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityProblems)
                        .accessDeniedHandler(securityProblems))
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .build();
    }

    /** Maps the Auth0 permissions claim to Spring scope authorities. */
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        var granted = new JwtGrantedAuthoritiesConverter();
        granted.setAuthorityPrefix("SCOPE_");
        granted.setAuthoritiesClaimName("permissions");

        var conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(granted);
        return conv;
    }

    /** Enforces the retained exact API key for the v1 internal identity route. */
    static class ApiKeyFilter extends OncePerRequestFilter {

        private static final Logger logger = LoggerFactory.getLogger(ApiKeyFilter.class);
        private final AuthProperties props;

        /** Creates the filter from users-service authentication properties. */
        ApiKeyFilter(AuthProperties props) {
            this.props = props;
        }

        /** Validates the API key without changing the legacy plain-text response. */
        @Override
        protected void doFilterInternal(HttpServletRequest request,
                HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {

            String path = request.getRequestURI();
            String apiKey = request.getHeader("X-API-KEY");

            // Logs pour debug
            logger.info("🔑 Incoming request to [{}] with X-API-KEY: {}",
                    path,
                    apiKey != null ? mask(apiKey) : "<none>");

            if (apiKey == null) {
                logger.warn("❌ Missing X-API-KEY header for path {}", path);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Missing API Key");
                return;
            }

            if (!apiKey.equals(props.getApiKey())) {
                logger.warn("🚫 Invalid API Key for path {} — received: {} expected: {}",
                        path, mask(apiKey), mask(props.getApiKey()));
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid API Key");
                return;
            }

            logger.info("✅ API key validated successfully for {}", path);
            chain.doFilter(request, response);
        }

        /** Masks an API key before legacy diagnostic logging. */
        private String mask(String key) {
            if (key == null || key.length() < 6)
                return "<invalid>";
            return key.substring(0, 4) + "..." + key.substring(key.length() - 4);
        }
    }
}
