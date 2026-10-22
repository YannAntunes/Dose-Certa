package br.com.dosecerta.dose.certa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        String origins = System.getenv("APP_CORS_ALLOWED_ORIGINS");
        List<String> allowed = (origins == null || origins.isBlank())
                ? List.of("http://localhost:*", "https://dose-certa-bay.vercel.app", "https://dose-certa-*.vercel.app")
                : Arrays.stream(origins.split(",")).map(String::trim).filter(x -> !x.isEmpty()).toList();
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOriginPatterns(allowed);
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setExposedHeaders(List.of("X-Idempotent-Replay"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
}
