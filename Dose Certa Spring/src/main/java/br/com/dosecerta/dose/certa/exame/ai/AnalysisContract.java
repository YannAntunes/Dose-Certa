package br.com.dosecerta.dose.certa.exame.ai;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Contrato de saida (schema da Gemini API) e instrucoes de sistema. Versao: {@value #CONTRACT_VERSION}. */
public final class AnalysisContract {

    public static final String CONTRACT_VERSION = "exam-analysis-v1";

    public static final String SYSTEM_INSTRUCTION = """
            Voce e um assistente de apoio a decisao clinica que ajuda profissionais de saude a organizar e entender \
            resultados laboratoriais ja estruturados. Responda SEMPRE em portugues do Brasil, estritamente no JSON do schema.

            Regras obrigatorias:
            - Use somente os dados fornecidos. Nao invente valores, unidades, referencias, tendencias, fontes ou citacoes.
            - Os campos 'status' de cada resultado foram calculados deterministicamente; NAO os contradiga. Para tipos \
            WITHIN_REFERENCE, BELOW_REFERENCE ou ABOVE_REFERENCE em um achado, o tipo deve ser igual ao status do resultado.
            - Resultado fora da referencia NAO e diagnostico. Nunca afirme que o paciente tem uma doenca com base em um \
            resultado isolado e nunca prescreva ou recomende alterar medicamentos ou tratamentos.
            - Diferencie referencia do laboratorio de meta clinica; metas listadas em 'clinicalTargetsNotApplied' NAO foram \
            aplicadas por faltar contexto clinico e nao devem ser usadas para classificar resultados.
            - Registre em 'warnings' as limitacoes: resultados com needsReview=true, baixa confianca de extracao, \
            referencias ausentes ou que exigem contexto.
            - Cite fontes apenas pelos ids presentes em 'retrievedSources'. Se a lista estiver vazia, nao cite fontes e \
            nao afirme ter consultado diretrizes ou documentos.
            - Tendencias (campo 'trends') somente para resultados com 'history' nao vazio, sem tratar pequenas variacoes \
            como piora ou melhora clinica.
            - Use 'resultKey' igual ao campo 'key' do resultado. Se os dados forem insuficientes, use status \
            INSUFFICIENT_CONTEXT e explique em 'summary' e 'warnings'.
            - 'severity' e apenas informativa (INFO, ATTENTION, RELEVANT) e nao e classificacao de gravidade clinica.
            """;

    private AnalysisContract() {}

    public static Map<String, Object> schema() {
        Map<String, Object> finding = object(Map.of(
                        "resultKey", nullableString(),
                        "type", enumeration("WITHIN_REFERENCE", "BELOW_REFERENCE", "ABOVE_REFERENCE",
                                "REQUIRES_CONTEXT", "CLINICAL_CONSIDERATION"),
                        "severity", enumeration("INFO", "ATTENTION", "RELEVANT"),
                        "title", string(),
                        "description", string(),
                        "sourceIds", array(string())),
                List.of("type", "severity", "title", "description", "sourceIds"));
        Map<String, Object> trend = object(Map.of("resultKey", string(), "description", string()),
                List.of("resultKey", "description"));
        return object(Map.of(
                        "status", enumeration("COMPLETED", "INSUFFICIENT_CONTEXT"),
                        "summary", string(),
                        "findings", array(finding),
                        "trends", array(trend),
                        "clinicalConsiderations", array(string()),
                        "warnings", array(string()),
                        "sources", array(string())),
                List.of("status", "summary", "findings", "trends", "clinicalConsiderations", "warnings", "sources"));
    }

    private static Map<String, Object> object(Map<String, Object> props, List<String> required) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "OBJECT");
        m.put("properties", props);
        m.put("required", required);
        return m;
    }

    private static Map<String, Object> array(Map<String, Object> items) {
        return Map.of("type", "ARRAY", "items", items);
    }

    private static Map<String, Object> string() {
        return Map.of("type", "STRING");
    }

    private static Map<String, Object> nullableString() {
        return Map.of("type", "STRING", "nullable", true);
    }

    private static Map<String, Object> enumeration(String... values) {
        return Map.of("type", "STRING", "enum", List.of(values));
    }
}
