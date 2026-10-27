package br.com.dosecerta.dose.certa.exame.service;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.model.*;
import br.com.dosecerta.dose.certa.exame.repo.*;
import br.com.dosecerta.dose.certa.exame.web.ExamDtos.*;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Consultas somente-leitura (mapeamento para DTOs dentro da transacao, pois open-in-view esta desligado). */
@Service
@Transactional(readOnly = true)
public class ExamQueryService {

    public static final String DISCLAIMER =
            "Apoio a decisao clinica: nao constitui diagnostico nem prescricao e nao substitui a avaliacao profissional.";

    private final ExamRepository exams;
    private final ExamResultRepository results;
    private final ExamAnalysisRepository analyses;
    private final ClinicalFindingRepository findings;
    private final AnalysisSourceRepository sources;
    private final PacienteRepository pacientes;

    public ExamQueryService(ExamRepository exams, ExamResultRepository results, ExamAnalysisRepository analyses,
                            ClinicalFindingRepository findings, AnalysisSourceRepository sources,
                            PacienteRepository pacientes) {
        this.exams = exams;
        this.results = results;
        this.analyses = analyses;
        this.findings = findings;
        this.sources = sources;
        this.pacientes = pacientes;
    }

    public ExamSummary summary(Long examId) {
        return toSummary(load(examId));
    }

    public ExamDetail detail(Long examId) {
        Exam e = load(examId);
        return new ExamDetail(toSummary(e), results(examId));
    }

    public List<ResultDto> results(Long examId) {
        load(examId);
        return results.findByExamIdOrderByIdAsc(examId).stream().map(ExamQueryService::toDto).toList();
    }

    public Page<ExamSummary> listByPatient(Long patientId, Pageable pageable) {
        if (!pacientes.existsById(patientId)) {
            throw new ExamException(HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND", "Paciente nao encontrado.");
        }
        return exams.findByPacienteId(patientId, pageable).map(this::toSummary);
    }

    /**
     * Composicao de series temporais de evolucao de analitos comparaveis para o paciente.
     * Somente combina resultados com mesma unidade e codigo de teste canonico; indica se ha dados suficientes (>= 2 pontos).
     */
    public List<AnalyteEvolutionSeries> patientEvolution(Long patientId) {
        if (!pacientes.existsById(patientId)) {
            throw new ExamException(HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND", "Paciente nao encontrado.");
        }
        List<ExamResult> numericResults = results.findAllNumericByPatient(patientId,
                List.of(ExamStatus.PROCESSED, ExamStatus.ANALYZED));

        Map<String, List<ExamResult>> byTestCode = new LinkedHashMap<>();
        for (ExamResult r : numericResults) {
            byTestCode.computeIfAbsent(r.getTestCode(), k -> new ArrayList<>()).add(r);
        }

        List<AnalyteEvolutionSeries> seriesList = new ArrayList<>();
        for (Map.Entry<String, List<ExamResult>> entry : byTestCode.entrySet()) {
            String testCode = entry.getKey();
            List<ExamResult> list = entry.getValue();
            if (list.isEmpty()) continue;

            ExamResult first = list.get(0);
            String canonicalName = first.getNormalizedName() != null ? first.getNormalizedName() : first.getOriginalName();
            String unit = first.getNormalizedUnit() != null ? first.getNormalizedUnit() : first.getOriginalUnit();

            List<AnalyteEvolutionPoint> points = new ArrayList<>();
            for (ExamResult r : list) {
                String rUnit = r.getNormalizedUnit() != null ? r.getNormalizedUnit() : r.getOriginalUnit();
                if (unit != null && !unit.equalsIgnoreCase(rUnit)) continue;

                LocalDate d = r.getResultDate() != null ? r.getResultDate() : r.getExam().getCollectionDate();
                if (d == null) continue;

                points.add(new AnalyteEvolutionPoint(
                        r.getExam().getId(),
                        r.getId(),
                        d,
                        r.getNumericValue(),
                        r.getTextValue(),
                        rUnit,
                        r.getStatus().name(),
                        r.getExam().getLaboratory()
                ));
            }

            if (!points.isEmpty()) {
                BigDecimal refLower = first.getRefLower();
                BigDecimal refUpper = first.getRefUpper();
                String refSource = first.getAppliedReference();
                boolean sufficient = points.size() >= 2;

                seriesList.add(new AnalyteEvolutionSeries(
                        testCode,
                        canonicalName,
                        unit,
                        refLower,
                        refUpper,
                        refSource,
                        points,
                        sufficient
                ));
            }
        }

        seriesList.sort(Comparator.comparing(AnalyteEvolutionSeries::canonicalName, String.CASE_INSENSITIVE_ORDER));
        return seriesList;
    }

    public Optional<AnalysisDto> latestAnalysis(Long examId) {
        load(examId);
        return analyses.findFirstByExamIdOrderByCreatedAtDescIdDesc(examId).map(this::toDto);
    }

    public List<AnalysisDto> listAnalyses(Long examId) {
        load(examId);
        return analyses.findByExamIdOrderByCreatedAtDescIdDesc(examId).stream().map(this::toDto).toList();
    }

    public AnalysisDto analysis(Long analysisId) {
        return analyses.findById(analysisId).map(this::toDto).orElseThrow();
    }

    private Exam load(Long examId) {
        return exams.findById(examId).orElseThrow(() ->
                new ExamException(HttpStatus.NOT_FOUND, "EXAM_NOT_FOUND", "Exame nao encontrado."));
    }

    private ExamSummary toSummary(Exam e) {
        return new ExamSummary(e.getId(), e.getPaciente().getId(), e.getLaboratory(), e.getCollectionDate(),
                e.getReleaseDate(), e.getOriginalFilename(), e.getStatus().name(), e.getErrorMessage(),
                e.getProcessingNotes(), results.countByExamIdAndHistoricalFalse(e.getId()),
                e.getCreatedAt(), e.getUpdatedAt());
    }

    static ResultDto toDto(ExamResult r) {
        return new ResultDto(r.getId(), r.getTestCode(), r.getOriginalName(), r.getNormalizedName(),
                r.getNumericValue(), r.getTextValue(), r.getOriginalUnit(), r.getNormalizedUnit(),
                r.getReferenceText(), r.getRefLower(), name(r.getRefLowerOp()), r.getRefUpper(),
                name(r.getRefUpperOp()), r.getStatus().name(), r.getStatusJustification(), r.getAppliedReference(),
                r.getContextReasonCode(), r.getSourcePage(), r.getConfidence(), r.isNeedsReview(), r.isQualitative(),
                r.isHistorical(), r.getResultDate(), r.getNotes());
    }

    private AnalysisDto toDto(ExamAnalysis a) {
        List<FindingDto> fs = findings.findByAnalysisIdOrderByIdAsc(a.getId()).stream()
                .map(f -> new FindingDto(f.getId(), f.getExamResult() == null ? null : f.getExamResult().getId(),
                        f.getType().name(), f.getSeverity().name(), f.getTitle(), f.getDescription(),
                        f.getSourceKeys() == null || f.getSourceKeys().isBlank() ? List.of()
                                : Arrays.asList(f.getSourceKeys().split(","))))
                .toList();
        List<SourceDto> ss = sources.findByAnalysisIdOrderByIdAsc(a.getId()).stream()
                .map(s -> new SourceDto(s.getSourceKey(), s.getTitle(), s.getOrganization(), s.getSourceType(),
                        s.getVersionId(), s.getUrl(), s.getExcerpt(), s.getLocator(), s.getAccessedAt()))
                .toList();
        List<String> warnings = a.getWarnings() == null || a.getWarnings().isBlank() ? List.of()
                : Arrays.asList(a.getWarnings().split("\n"));
        return new AnalysisDto(a.getId(), a.getExam().getId(), a.getStatus().name(), a.getSummary(), a.getClinicalContext(),
                warnings, a.getModelId(), a.getContractVersion(), a.getErrorMessage(), a.getCreatedAt(), a.getCompletedAt(),
                fs, ss, DISCLAIMER);
    }

    private static String name(Enum<?> e) { return e == null ? null : e.name(); }
}
