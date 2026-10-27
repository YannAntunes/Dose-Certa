package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.entity.Consulta;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.ai.KnowledgeRetriever.RetrievedSource;
import br.com.dosecerta.dose.certa.exame.history.HistoryService;
import br.com.dosecerta.dose.certa.exame.history.HistoryService.HistoryPoint;
import br.com.dosecerta.dose.certa.exame.model.ClinicalTarget;
import br.com.dosecerta.dose.certa.exame.model.Exam;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.repo.ClinicalTargetRepository;
import br.com.dosecerta.dose.certa.exame.repo.ExamResultRepository;
import br.com.dosecerta.dose.certa.repository.ConsultaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Monta o contexto estruturado enviado a IA: somente dados clinicos necessarios (idade, sexo informado,
 * resultados, referencias, status deterministicos, historico comparavel, prescricoes recentes e fontes recuperadas).
 * Aplica minimizacao rigorosa de dados: NUNCA inclui nome, CPF, documento, telefone, endereco ou nome de arquivo.
 */
@Component
public class AnalysisContextBuilder {

    private final ExamResultRepository results;
    private final ClinicalTargetRepository targets;
    private final HistoryService history;
    private final KnowledgeRetriever retriever;
    private final ObjectMapper mapper;
    private final ObjectProvider<ConsultaRepository> consultaRepoProvider;

    public AnalysisContextBuilder(ExamResultRepository results, ClinicalTargetRepository targets,
                                  HistoryService history, KnowledgeRetriever retriever, ObjectMapper mapper,
                                  ObjectProvider<ConsultaRepository> consultaRepoProvider) {
        this.results = results;
        this.targets = targets;
        this.history = history;
        this.retriever = retriever;
        this.mapper = mapper;
        this.consultaRepoProvider = consultaRepoProvider;
    }

    public AnalysisContext build(Exam exam) {
        return build(exam, null);
    }

    /** Deve ser chamado dentro de uma transacao (entidades LAZY). */
    public AnalysisContext build(Exam exam, String clinicalContext) {
        Paciente patient = exam.getPaciente();
        Map<String, Long> idByKey = new LinkedHashMap<>();
        Map<String, ResultStatus> statusByKey = new HashMap<>();
        Set<String> trendKeys = new HashSet<>();
        List<Map<String, Object>> items = new ArrayList<>();
        Set<String> codes = new LinkedHashSet<>();

        for (ExamResult r : results.findByExamIdOrderByIdAsc(exam.getId())) {
            if (r.isHistorical()) continue;
            String key = r.getTestCode() != null ? r.getTestCode() : "R" + r.getId();
            if (idByKey.containsKey(key)) key = key + "#" + r.getId();
            idByKey.put(key, r.getId());
            statusByKey.put(key, r.getStatus());
            if (r.getTestCode() != null) codes.add(r.getTestCode());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", key);
            item.put("name", r.getOriginalName());
            item.put("value", r.getNumericValue() != null ? r.getNumericValue().stripTrailingZeros().toPlainString() : r.getTextValue());
            item.put("unit", r.getNormalizedUnit() != null ? r.getNormalizedUnit() : r.getOriginalUnit());
            item.put("laboratoryReferenceText", r.getReferenceText());
            item.put("deterministicStatus", r.getStatus().name());
            item.put("statusJustification", r.getStatusJustification());
            if (r.getContextReasonCode() != null) {
                item.put("contextReasonCode", r.getContextReasonCode());
            }
            item.put("needsReview", r.isNeedsReview());
            item.put("extractionConfidence", r.getConfidence());
            if (r.getNotes() != null) item.put("extractionNotes", r.getNotes());
            List<HistoryPoint> points = history.comparable(patient.getId(), r);
            if (!points.isEmpty()) {
                trendKeys.add(key);
                item.put("history", points.stream().map(p -> Map.of(
                        "date", p.date().toString(), "value", p.value().stripTrailingZeros().toPlainString(),
                        "unit", p.unit())).toList());
            }
            items.add(item);
        }

        List<Map<String, Object>> notApplied = new ArrayList<>();
        for (String code : codes) {
            for (ClinicalTarget t : targets.findByTestCode(code)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("testCode", code);
                m.put("criterion", t.getCriterion());
                m.put("clinicalCondition", t.getClinicalCondition());
                m.put("source", t.getSourceTitle());
                notApplied.add(m);
            }
        }

        List<RetrievedSource> retrieved = retriever.retrieve(codes);
        Map<String, RetrievedSource> sourcesByKey = new LinkedHashMap<>();
        for (RetrievedSource s : retrieved) sourcesByKey.put(s.key(), s);

        Map<String, Object> patientCtx = new LinkedHashMap<>();
        if (patient.getIdade() > 0) patientCtx.put("ageYears", patient.getIdade());
        if (exam.getSex() != null) patientCtx.put("sex", exam.getSex().name());

        // Contexto clinico complementar (prescricoes registradas e notas medicas)
        Map<String, Object> clinicalHistory = new LinkedHashMap<>();
        if (clinicalContext != null && !clinicalContext.isBlank()) {
            clinicalHistory.put("additionalDoctorNotes", clinicalContext.trim());
        }

        ConsultaRepository consultaRepo = consultaRepoProvider != null ? consultaRepoProvider.getIfAvailable() : null;
        if (consultaRepo != null) {
            List<Consulta> past = consultaRepo.findByPacienteIdOrderByDataHoraDesc(patient.getId());
            List<Map<String, Object>> meds = new ArrayList<>();
            for (Consulta c : past) {
                if (c.getMedicamento() != null && meds.size() < 8) {
                    Map<String, Object> med = new LinkedHashMap<>();
                    med.put("medication", c.getMedicamento().getNome());
                    med.put("doseCalculated", c.getResultadoCalculo() + " " + (c.getUnidadeResultado() != null ? c.getUnidadeResultado() : ""));
                    if (c.getDataHora() != null) med.put("date", c.getDataHora().toLocalDate().toString());
                    meds.add(med);
                }
            }
            if (!meds.isEmpty()) {
                clinicalHistory.put("recordedPrescriptionsInSystem", meds);
            }
        }

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("patient", patientCtx);
        if (!clinicalHistory.isEmpty()) {
            root.put("clinicalContext", clinicalHistory);
        }
        root.put("results", items);
        root.put("clinicalTargetsNotApplied", notApplied);
        root.put("retrievedSources", sourcesByKey.values().stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.key());
            m.put("title", s.title());
            m.put("organization", s.organization());
            m.put("version", s.versionId());
            m.put("excerpt", s.excerpt());
            return m;
        }).toList());

        String json;
        try {
            json = mapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Falha ao serializar contexto da analise.");
        }
        String prompt = "Analise os dados estruturados abaixo e responda estritamente no schema.\n" + json;
        return new AnalysisContext(prompt, idByKey, statusByKey, trendKeys, sourcesByKey);
    }
}
