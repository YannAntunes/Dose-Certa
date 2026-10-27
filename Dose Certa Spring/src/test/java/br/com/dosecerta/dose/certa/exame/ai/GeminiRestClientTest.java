package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.exame.ai.GeminiException.Kind;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/** Testa o cliente HTTP contra um servidor local de mentira (nenhuma chamada externa, nenhuma chave real). */
class GeminiRestClientTest {

    private HttpServer server;
    private volatile int status = 200;
    private volatile String body = "";
    private volatile long delayMs = 0;
    private final AtomicReference<String> lastPath = new AtomicReference<>();
    private final AtomicReference<String> lastKey = new AtomicReference<>();
    private final AtomicReference<String> lastBody = new AtomicReference<>();

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            lastPath.set(ex.getRequestURI().getPath());
            lastKey.set(ex.getRequestHeaders().getFirst("x-goog-api-key"));
            lastBody.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            try {
                if (delayMs > 0) Thread.sleep(delayMs);
            } catch (InterruptedException ignored) { }
            byte[] out = body.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            try {
                ex.sendResponseHeaders(status, out.length);
                ex.getResponseBody().write(out);
            } catch (IOException ignored) { }
            ex.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private GeminiRestClient client() {
        return client(5000, 5000);
    }

    private GeminiRestClient client(int connectMs, int readMs) {
        String base = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta";
        return new GeminiRestClient(new ExamModuleProperties(
                new ExamModuleProperties.Storage("x"), new ExamModuleProperties.Upload(1, 1),
                new ExamModuleProperties.Gemini("fake-key-for-test", "test-model", base, connectMs, readMs)),
                new ObjectMapper());
    }

    private static String envelope(String finish, String text) {
        return "{\"candidates\":[{\"finishReason\":\"" + finish + "\",\"content\":{\"parts\":[{\"text\":"
                + new ObjectMapper().valueToTree(text) + "}]}}]}";
    }

    @Test
    void sendsKeyInHeaderAndStructuredOutputConfigAndReturnsText() {
        body = envelope("STOP", "{\"ok\":true}");
        String out = client().generate("sys", "prompt", Map.of("type", "OBJECT"));
        assertEquals("{\"ok\":true}", out);
        assertEquals("/v1beta/models/test-model:generateContent", lastPath.get());
        assertEquals("fake-key-for-test", lastKey.get());
        assertTrue(lastBody.get().contains("\"responseMimeType\":\"application/json\""));
        assertTrue(lastBody.get().contains("responseSchema"));
        assertFalse(lastPath.get().contains("fake-key"), "chave nao pode ir na URL");
    }

    @Test
    void rateLimitIsMappedAndRecoverable() {
        status = 429;
        body = "{}";
        GeminiException e = assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of()));
        assertEquals(Kind.RATE_LIMIT, e.getKind());
        assertTrue(e.isRecoverable());
    }

    @Test
    void serverErrorIsRecoverableAndClientErrorIsNot() {
        status = 503;
        body = "{}";
        GeminiException e5 = assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of()));
        assertEquals(Kind.PROVIDER_ERROR, e5.getKind());
        assertTrue(e5.isRecoverable());
        status = 400;
        GeminiException e4 = assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of()));
        assertFalse(e4.isRecoverable());
        assertFalse(e4.getMessage().contains("fake-key"));
    }

    @Test
    void truncatedOrMalformedEnvelopeIsRejected() {
        body = envelope("MAX_TOKENS", "{\"par");
        assertEquals(Kind.INVALID_ENVELOPE,
                assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of())).getKind());
        body = "isto nao e json";
        assertEquals(Kind.INVALID_ENVELOPE,
                assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of())).getKind());
        body = "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}";
        assertEquals(Kind.INVALID_ENVELOPE,
                assertThrows(GeminiException.class, () -> client().generate("s", "p", Map.of())).getKind());
    }

    @Test
    void readTimeoutIsMapped() {
        body = envelope("STOP", "{}");
        delayMs = 600;
        GeminiRestClient fastClient = client(2000, 200);
        GeminiException e = assertThrows(GeminiException.class, () -> fastClient.generate("s", "p", Map.of()));
        assertEquals(Kind.TIMEOUT, e.getKind());
    }
}
