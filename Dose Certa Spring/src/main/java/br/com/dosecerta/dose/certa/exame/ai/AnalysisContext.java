package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.exame.ai.KnowledgeRetriever.RetrievedSource;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;

import java.util.Map;
import java.util.Set;

/**
 * Contexto montado para a IA e dados de referencia usados na validacao da resposta.
 * Nao contem nome, CPF ou outros identificadores pessoais.
 */
public record AnalysisContext(String userPrompt,
                              Map<String, Long> resultIdByKey,
                              Map<String, ResultStatus> statusByKey,
                              Set<String> trendKeys,
                              Map<String, RetrievedSource> sourcesByKey) {}
