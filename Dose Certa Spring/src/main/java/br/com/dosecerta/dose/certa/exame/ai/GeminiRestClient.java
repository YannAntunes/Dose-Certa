package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import br.com.dosecerta.dose.certa.exame.ai.GeminiException.Kind;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Cliente REST do endpoint {@code generateContent} da Gemini API (chave no cabecalho {@code x-goog-api-key},
 * saida estruturada via {@code responseMimeType}/{@code responseSchema}). Nao registra corpo nem chave em logs.
 */
@Component
public class GeminiRestClient implements GeminiClient {

    private final ExamModuleProperties.Gemini cfg;
    private final RestClient client;
    private final ObjectMapper mapper;

    public GeminiRestClient(ExamModuleProperties props, ObjectMapper mapper) {
        this.cfg = props.gemini();
        this.mapper = mapper;
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofMillis(cfg.connectTimeoutMs())).build());
        factory.setReadTimeout(Duration.ofMillis(cfg.readTimeoutMs()));
        this.client = RestClient.builder().baseUrl(cfg.baseUrl()).requestFactory(factory).build();
    }

    @Override
    public boolean isConfigured() {
        return cfg.configured();
    }

    @Override
    public String modelId() {
        return cfg.model();
    }

    @Override
    public String generate(String systemInstruction, String userPrompt, Map<String, Object> responseSchema) {
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 8192,
                        "responseMimeType", "application/json",
                        "responseSchema", responseSchema));
        String raw;
        try {
            raw = client.post()
                    .uri("/models/{model}:generateContent", cfg.model())
                    .header("x-goog-api-key", cfg.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 429) {
                throw new GeminiException(Kind.RATE_LIMIT, "Limite de requisicoes do provedor de IA atingido.", true);
            }
            throw new GeminiException(Kind.PROVIDER_ERROR, "O provedor de IA retornou erro HTTP " + status + ".",
                    status >= 500);
        } catch (ResourceAccessException e) {
            Throwable cause = e.getCause();
            boolean isTimeout = false;
            while (cause != null) {
                if (cause instanceof HttpTimeoutException
                        || cause instanceof java.net.SocketTimeoutException
                        || cause.getClass().getSimpleName().contains("Timeout")) {
                    isTimeout = true;
                    break;
                }
                cause = cause.getCause();
            }
            if (!isTimeout && e.getMessage() != null && e.getMessage().toLowerCase().contains("time")) {
                isTimeout = true;
            }
            if (isTimeout) {
                throw new GeminiException(Kind.TIMEOUT, "Tempo limite excedido ao consultar o provedor de IA.", true);
            }
            throw new GeminiException(Kind.PROVIDER_ERROR, "Provedor de IA indisponivel.", true);
        }
        return extractText(raw);
    }

    private String extractText(String raw) {
        try {
            JsonNode root = mapper.readTree(raw);
            if (root.path("promptFeedback").hasNonNull("blockReason")) {
                throw new GeminiException(Kind.INVALID_ENVELOPE, "Requisicao bloqueada pelo provedor de IA.", false);
            }
            JsonNode cand = root.path("candidates").path(0);
            String finish = cand.path("finishReason").asText("");
            if (!finish.equals("STOP")) {
                throw new GeminiException(Kind.INVALID_ENVELOPE,
                        "Resposta da IA incompleta ou interrompida (" + finish + ").", true);
            }
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : cand.path("content").path("parts")) {
                if (part.path("thought").asBoolean(false)) continue;
                sb.append(part.path("text").asText(""));
            }
            if (sb.length() == 0) {
                throw new GeminiException(Kind.INVALID_ENVELOPE, "Resposta da IA sem conteudo.", true);
            }
            return sb.toString();
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException(Kind.INVALID_ENVELOPE, "Resposta do provedor de IA ilegivel.", true);
        }
    }
}
