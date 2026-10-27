package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.exame.ai.AnalysisResponseValidator.InvalidAiResponseException;
import br.com.dosecerta.dose.certa.exame.ai.KnowledgeRetriever.RetrievedSource;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AnalysisResponseValidatorTest {

    private final AnalysisResponseValidator validator = new AnalysisResponseValidator();

    private final AnalysisContext ctx = new AnalysisContext("prompt",
            Map.of("GLUCOSE", 1L, "AST", 2L),
            Map.of("GLUCOSE", ResultStatus.WITHIN_REFERENCE, "AST", ResultStatus.REQUIRES_CONTEXT),
            Set.of("GLUCOSE"),
            Map.of("S1", new RetrievedSource("S1", "Titulo", "Org", "GUIDELINE", "v1", null, "trecho", null)));

    private static String json(String findings, String trends, String sources, String status) {
        return """
                {"status":"%s","summary":"Resumo","findings":%s,"trends":%s,
                 "clinicalConsiderations":[],"warnings":["limitacao"],"sources":%s}
                """.formatted(status, findings, trends, sources);
    }

    private static String finding(String key, String type, String sources) {
        return """
                [{"resultKey":%s,"type":"%s","severity":"INFO","title":"T","description":"D","sourceIds":%s}]
                """.formatted(key == null ? "null" : "\"" + key + "\"", type, sources);
    }

    @Test
    void acceptsValidResponse() {
        var out = validator.validate(json(finding("GLUCOSE", "WITHIN_REFERENCE", "[\"S1\"]"),
                "[{\"resultKey\":\"GLUCOSE\",\"description\":\"estavel\"}]", "[\"S1\"]", "COMPLETED"), ctx);
        assertEquals("COMPLETED", out.status());
        assertEquals(1, out.findings().size());
    }

    @Test
    void acceptsInsufficientContextWithoutFindings() {
        var out = validator.validate(json("[]", "[]", "[]", "INSUFFICIENT_CONTEXT"), ctx);
        assertEquals("INSUFFICIENT_CONTEXT", out.status());
    }

    @Test
    void rejectsMalformedJson() {
        assertThrows(InvalidAiResponseException.class, () -> validator.validate("nao e json", ctx));
    }

    @Test
    void rejectsUnknownProperties() {
        String bad = json(finding("GLUCOSE", "WITHIN_REFERENCE", "[]"), "[]", "[]", "COMPLETED")
                .replace("\"summary\"", "\"diagnosis\":\"x\",\"summary\"");
        assertThrows(InvalidAiResponseException.class, () -> validator.validate(bad, ctx));
    }

    @Test
    void rejectsStatusOutsideContract() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json("[]", "[]", "[]", "ERROR"), ctx));
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json("[]", "[]", "[]", "DIAGNOSED"), ctx));
    }

    @Test
    void rejectsCompletedWithoutFindings() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json("[]", "[]", "[]", "COMPLETED"), ctx));
    }

    @Test
    void rejectsFindingThatContradictsDeterministicStatus() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "ABOVE_REFERENCE", "[]"), "[]", "[]", "COMPLETED"), ctx));
        // resultado que exige contexto nao pode ser classificado pela IA
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("AST", "WITHIN_REFERENCE", "[]"), "[]", "[]", "COMPLETED"), ctx));
    }

    @Test
    void rejectsUnknownResultKeyAndFindingTypeTrendOrDiagnosis() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("FAKE", "REQUIRES_CONTEXT", "[]"), "[]", "[]", "COMPLETED"), ctx));
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "DIAGNOSIS", "[]"), "[]", "[]", "COMPLETED"), ctx));
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "TREND", "[]"), "[]", "[]", "COMPLETED"), ctx));
    }

    @Test
    void rejectsInventedSources() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "WITHIN_REFERENCE", "[\"OMS-2099\"]"), "[]", "[]", "COMPLETED"), ctx));
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "WITHIN_REFERENCE", "[]"), "[]", "[\"X\"]", "COMPLETED"), ctx));
    }

    @Test
    void rejectsTrendWithoutComparableHistory() {
        assertThrows(InvalidAiResponseException.class, () ->
                validator.validate(json(finding("GLUCOSE", "WITHIN_REFERENCE", "[]"),
                        "[{\"resultKey\":\"AST\",\"description\":\"piorou\"}]", "[]", "COMPLETED"), ctx));
    }
}
