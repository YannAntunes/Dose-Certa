package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.AnalysisStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.FindingType;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Severity;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** Valida estritamente a resposta da IA contra o contrato e contra os dados deterministicos enviados. */
@Component
public class AnalysisResponseValidator {

    public record Finding(String resultKey, String type, String severity, String title, String description,
                          List<String> sourceIds) {}

    public record Trend(String resultKey, String description) {}

    public record Output(String status, String summary, List<Finding> findings, List<Trend> trends,
                         List<String> clinicalConsiderations, List<String> warnings, List<String> sources) {}

    public static class InvalidAiResponseException extends RuntimeException {
        public InvalidAiResponseException(String message) { super(message); }
    }

    private static final int MAX_TEXT = 4000;
    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);

    public Output validate(String json, AnalysisContext ctx) {
        Output out;
        try {
            out = mapper.readValue(json, Output.class);
        } catch (Exception e) {
            throw new InvalidAiResponseException("JSON fora do contrato.");
        }
        if (out == null) throw new InvalidAiResponseException("Resposta vazia.");
        AnalysisStatus status;
        try {
            status = AnalysisStatus.valueOf(out.status());
        } catch (Exception e) {
            throw new InvalidAiResponseException("Status invalido.");
        }
        if (status != AnalysisStatus.COMPLETED && status != AnalysisStatus.INSUFFICIENT_CONTEXT) {
            throw new InvalidAiResponseException("Status nao permitido.");
        }
        requireText(out.summary(), "summary");
        if (out.findings() == null || out.trends() == null || out.clinicalConsiderations() == null
                || out.warnings() == null || out.sources() == null) {
            throw new InvalidAiResponseException("Campos obrigatorios ausentes.");
        }
        if (status == AnalysisStatus.COMPLETED && out.findings().isEmpty()) {
            throw new InvalidAiResponseException("Analise concluida sem observacoes.");
        }
        for (Finding f : out.findings()) {
            FindingType type = parse(FindingType.class, f.type());
            parse(Severity.class, f.severity());
            if (type == FindingType.TREND) throw new InvalidAiResponseException("Tendencias devem usar o campo 'trends'.");
            requireText(f.title(), "title");
            requireText(f.description(), "description");
            if (f.resultKey() != null && !ctx.resultIdByKey().containsKey(f.resultKey())) {
                throw new InvalidAiResponseException("resultKey desconhecido.");
            }
            ResultStatus expected = switch (type) {
                case WITHIN_REFERENCE -> ResultStatus.WITHIN_REFERENCE;
                case BELOW_REFERENCE -> ResultStatus.BELOW_REFERENCE;
                case ABOVE_REFERENCE -> ResultStatus.ABOVE_REFERENCE;
                default -> null;
            };
            if (expected != null) {
                if (f.resultKey() == null || ctx.statusByKey().get(f.resultKey()) != expected) {
                    throw new InvalidAiResponseException("Achado contradiz o status deterministico.");
                }
            }
            checkSources(f.sourceIds(), ctx);
        }
        for (Trend t : out.trends()) {
            if (t.resultKey() == null || !ctx.trendKeys().contains(t.resultKey())) {
                throw new InvalidAiResponseException("Tendencia sem historico comparavel.");
            }
            requireText(t.description(), "trend.description");
        }
        checkSources(out.sources(), ctx);
        for (String s : concat(out.clinicalConsiderations(), out.warnings())) requireText(s, "texto");
        return out;
    }

    private static List<String> concat(List<String> a, List<String> b) {
        List<String> l = new ArrayList<>(a);
        l.addAll(b);
        return l;
    }

    private static void checkSources(List<String> ids, AnalysisContext ctx) {
        if (ids == null) throw new InvalidAiResponseException("Lista de fontes ausente.");
        for (String id : ids) {
            if (!ctx.sourcesByKey().containsKey(id)) throw new InvalidAiResponseException("Fonte nao verificada citada.");
        }
    }

    private static <E extends Enum<E>> E parse(Class<E> c, String v) {
        try {
            return Enum.valueOf(c, v);
        } catch (Exception e) {
            throw new InvalidAiResponseException("Valor de enumeracao invalido.");
        }
    }

    private static void requireText(String s, String field) {
        if (s == null || s.isBlank() || s.length() > MAX_TEXT) {
            throw new InvalidAiResponseException("Campo textual invalido: " + field);
        }
    }
}
