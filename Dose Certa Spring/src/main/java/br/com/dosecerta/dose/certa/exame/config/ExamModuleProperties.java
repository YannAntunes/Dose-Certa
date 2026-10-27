package br.com.dosecerta.dose.certa.exame.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;

/** Configuracao do modulo de exames (prefixo {@code exam}). */
@ConfigurationProperties(prefix = "exam")
public record ExamModuleProperties(@DefaultValue Storage storage,
                                   @DefaultValue Upload upload,
                                   @DefaultValue Gemini gemini) {

    public record Storage(@DefaultValue("./data/exams") String dir) {}

    public record Upload(@DefaultValue("10485760") long maxBytes,
                         @DefaultValue("200") int maxPages) {}

    public record Gemini(@DefaultValue("") String apiKey,
                         @DefaultValue("gemini-3.5-flash-lite") String model,
                         @DefaultValue("https://generativelanguage.googleapis.com/v1beta") String baseUrl,
                         @DefaultValue("5000") int connectTimeoutMs,
                         @DefaultValue("60000") int readTimeoutMs) {
        public boolean configured() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    @Configuration
    @EnableConfigurationProperties(ExamModuleProperties.class)
    public static class Registration {}
}
