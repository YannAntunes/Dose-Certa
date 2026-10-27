package br.com.dosecerta.dose.certa.exame.service;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.ai.*;
import br.com.dosecerta.dose.certa.exame.ai.AnalysisResponseValidator.Finding;
import br.com.dosecerta.dose.certa.exame.ai.AnalysisResponseValidator.InvalidAiResponseException;
import br.com.dosecerta.dose.certa.exame.ai.AnalysisResponseValidator.Output;
import br.com.dosecerta.dose.certa.exame.ai.AnalysisResponseValidator.Trend;
import br.com.dosecerta.dose.certa.exame.ai.KnowledgeRetriever.RetrievedSource;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import br.com.dosecerta.dose.certa.exame.model.*;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.*;
import br.com.dosecerta.dose.certa.exame.repo.*;
import br.com.dosecerta.dose.certa.exame.web.ExamDtos.AnalysisDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Orquestra a analise assistida por IA. A IA nunca grava no banco: apenas a resposta validada e persistida
 * por este servico. Execucoes anteriores sao preservadas; falhas geram uma analise ERROR auditavel.
 */
@Service
public class ExamAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ExamAnalysisService.class);

    private final ExamRepository exams;
    private final ExamResultRepository results;
    private final ExamAnalysisRepository analyses;
    private final ClinicalFindingRepository findings;
    private final AnalysisSourceRepository sources;
    private final AnalysisContextBuilder contextBuilder;
    private final GeminiClient gemini;
    private final AnalysisResponseValidator validator;
    private final ExamQueryService queries;
    private final TransactionTemplate tx;
    private final TransactionTemplate readTx;
    private final long staleAfterSeconds;

    public ExamAnalysisService(ExamRepository exams, ExamResultRepository results, ExamAnalysisRepository analyses,
                               ClinicalFindingRepository findings, AnalysisSourceRepository sources,
                               AnalysisContextBuilder contextBuilder, GeminiClient gemini,
                               AnalysisResponseValidator validator, ExamQueryService queries,
                               PlatformTransactionManager txManager, ExamModuleProperties props) {
        this.exams = exams;
        this.results = results;
        this.analyses = analyses;
        this.findings = findings;
        this.sources = sources;
        this.contextBuilder = contextBuilder;
        this.gemini = gemini;
        this.validator = validator;
        this.queries = queries;
        this.tx = new TransactionTemplate(txManager);
        this.readTx = new TransactionTemplate(txManager);
        this.readTx.setReadOnly(true);
        this.staleAfterSeconds = props.gemini().readTimeoutMs() / 1000 * 2 + 60;
    }

    public AnalysisDto analyze(Long examId, String login) {
        return analyze(examId, login, null);
    }

    public AnalysisDto analyze(Long examId, String login, String clinicalContext) {
        if (!gemini.isConfigured()) {
            throw new ExamException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED",
                    "A integracao com o provedor de IA nao esta configurada.", false);
        }
        Long analysisId = begin(examId, login, clinicalContext);
        try {
            AnalysisContext ctx = readTx.execute(s -> contextBuilder.build(exams.findById(examId).orElseThrow(), clinicalContext));
            String raw;
            try {
                raw = gemini.generate(AnalysisContract.SYSTEM_INSTRUCTION, ctx.userPrompt(), AnalysisContract.schema());
            } catch (GeminiException e) {
                finishError(analysisId, e.getMessage());
                throw map(e);
            }
            Output output;
            try {
                output = validator.validate(raw, ctx);
            } catch (InvalidAiResponseException e) {
                log.warn("Resposta da IA rejeitada para analise id={}: {}", analysisId, e.getMessage());
                finishError(analysisId, "Resposta da IA rejeitada pela validacao: " + e.getMessage());
                throw new ExamException(HttpStatus.BAD_GATEWAY, "AI_INVALID_RESPONSE",
                        "A resposta da IA nao atendeu ao contrato de validacao e nao foi persistida como analise.", true);
            }
            persist(analysisId, output, ctx);
        } catch (ExamException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Falha inesperada na analise id={}: {}", analysisId, e.getClass().getSimpleName());
            finishError(analysisId, "Falha inesperada ao processar a analise.");
            throw e;
        }
        return queries.analysis(analysisId);
    }

    private Long begin(Long examId, String login, String clinicalContext) {
        return tx.execute(s -> {
            Exam exam = exams.findByIdForUpdate(examId).orElseThrow(() ->
                    new ExamException(HttpStatus.NOT_FOUND, "EXAM_NOT_FOUND", "Exame nao encontrado."));
            if (exam.getStatus() != ExamStatus.PROCESSED && exam.getStatus() != ExamStatus.ANALYZED) {
                throw new ExamException(HttpStatus.CONFLICT, "EXAM_NOT_READY",
                        "O exame ainda nao foi processado com sucesso.");
            }
            if (results.countByExamIdAndHistoricalFalse(examId) == 0) {
                throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "NO_RESULTS_FOUND",
                        "O exame nao possui resultados para analisar.");
            }
            LocalDateTime cutoff = LocalDateTime.now().minusSeconds(staleAfterSeconds);
            if (analyses.findFirstByExamIdAndStatusAndCreatedAtAfter(examId, AnalysisStatus.PROCESSING, cutoff).isPresent()) {
                throw new ExamException(HttpStatus.CONFLICT, "ANALYSIS_IN_PROGRESS",
                        "Ja existe uma analise em andamento para este exame.", true);
            }
            ExamAnalysis a = new ExamAnalysis();
            a.setExam(exam);
            a.setStatus(AnalysisStatus.PROCESSING);
            a.setModelId(gemini.modelId());
            a.setContractVersion(AnalysisContract.CONTRACT_VERSION);
            a.setRequestedBy(login == null ? "desconhecido" : login);
            a.setClinicalContext(clinicalContext);
            return analyses.saveAndFlush(a).getId();
        });
    }

    private void persist(Long analysisId, Output out, AnalysisContext ctx) {
        tx.executeWithoutResult(s -> {
            ExamAnalysis a = analyses.findById(analysisId).orElseThrow();
            a.setStatus(AnalysisStatus.valueOf(out.status()));
            a.setSummary(out.summary());
            a.setWarnings(out.warnings().isEmpty() ? null : String.join("\n", out.warnings()));
            a.setCompletedAt(LocalDateTime.now());
            a.setErrorMessage(null);
            analyses.save(a);

            Set<String> usedSources = new LinkedHashSet<>(out.sources());
            for (Finding f : out.findings()) {
                ClinicalFinding cf = new ClinicalFinding();
                cf.setAnalysis(a);
                if (f.resultKey() != null) cf.setExamResult(results.getReferenceById(ctx.resultIdByKey().get(f.resultKey())));
                cf.setType(FindingType.valueOf(f.type()));
                cf.setSeverity(Severity.valueOf(f.severity()));
                cf.setTitle(truncate(f.title(), 300));
                cf.setDescription(f.description());
                cf.setSourceKeys(f.sourceIds().isEmpty() ? null : truncate(String.join(",", f.sourceIds()), 500));
                usedSources.addAll(f.sourceIds());
                findings.save(cf);
            }
            for (Trend t : out.trends()) {
                ClinicalFinding cf = new ClinicalFinding();
                cf.setAnalysis(a);
                cf.setExamResult(results.getReferenceById(ctx.resultIdByKey().get(t.resultKey())));
                cf.setType(FindingType.TREND);
                cf.setSeverity(Severity.INFO);
                cf.setTitle("Tendencia: " + t.resultKey());
                cf.setDescription(t.description());
                findings.save(cf);
            }
            for (String c : out.clinicalConsiderations()) {
                ClinicalFinding cf = new ClinicalFinding();
                cf.setAnalysis(a);
                cf.setType(FindingType.CLINICAL_CONSIDERATION);
                cf.setSeverity(Severity.INFO);
                cf.setTitle("Consideracao clinica");
                cf.setDescription(c);
                findings.save(cf);
            }
            for (String key : usedSources) {
                RetrievedSource rs = ctx.sourcesByKey().get(key);
                AnalysisSource as = new AnalysisSource();
                as.setAnalysis(a);
                as.setSourceKey(rs.key());
                as.setTitle(rs.title());
                as.setOrganization(rs.organization());
                as.setSourceType(rs.sourceType());
                as.setVersionId(rs.versionId());
                as.setUrl(rs.url());
                as.setExcerpt(rs.excerpt());
                as.setLocator(rs.locator());
                sources.save(as);
            }
            Exam exam = a.getExam();
            exam.setStatus(ExamStatus.ANALYZED);
            exams.save(exam);
        });
    }

    private void finishError(Long analysisId, String message) {
        tx.executeWithoutResult(s -> analyses.findById(analysisId).ifPresent(a -> {
            a.setStatus(AnalysisStatus.ERROR);
            a.setErrorMessage(truncate(message, 500));
            a.setCompletedAt(LocalDateTime.now());
            analyses.save(a);
        }));
    }

    private static ExamException map(GeminiException e) {
        return switch (e.getKind()) {
            case TIMEOUT -> new ExamException(HttpStatus.GATEWAY_TIMEOUT, "AI_TIMEOUT", e.getMessage(), true);
            case RATE_LIMIT -> new ExamException(HttpStatus.TOO_MANY_REQUESTS, "AI_RATE_LIMIT", e.getMessage(), true);
            case PROVIDER_ERROR -> new ExamException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", e.getMessage(), e.isRecoverable());
            case INVALID_ENVELOPE -> new ExamException(HttpStatus.BAD_GATEWAY, "AI_INVALID_RESPONSE", e.getMessage(), e.isRecoverable());
        };
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
