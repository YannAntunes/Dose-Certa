package br.com.dosecerta.dose.certa.exame.ai;

import java.util.Map;

/** Cliente do provedor de IA; implementacao isolada para permitir mocks e troca de provedor. */
public interface GeminiClient {

    boolean isConfigured();

    String modelId();

    /**
     * Executa a geracao com saida JSON restrita ao schema.
     *
     * @return texto JSON retornado pelo modelo (ainda NAO validado)
     * @throws GeminiException em timeout, limite de requisicoes, erro do provedor ou envelope invalido
     */
    String generate(String systemInstruction, String userPrompt, Map<String, Object> responseSchema);
}
