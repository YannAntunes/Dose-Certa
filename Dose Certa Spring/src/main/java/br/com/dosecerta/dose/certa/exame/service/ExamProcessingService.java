package br.com.dosecerta.dose.certa.exame.service;

import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.extract.ExtractedDocument;
import br.com.dosecerta.dose.certa.exame.extract.OcrEngine;
import br.com.dosecerta.dose.certa.exame.extract.PdfTextExtractor;
import br.com.dosecerta.dose.certa.exame.model.Exam;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import br.com.dosecerta.dose.certa.exame.norm.TestNormalizer;
import br.com.dosecerta.dose.certa.exame.norm.TestNormalizer.TestInfo;
import br.com.dosecerta.dose.certa.exame.parse.LabReportParser;
import br.com.dosecerta.dose.certa.exame.parse.LabReportParser.ParsedReport;
import br.com.dosecerta.dose.certa.exame.parse.LabReportParser.ParsedResult;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceBand;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceRangeService;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceRangeService.Evaluation;
import br.com.dosecerta.dose.certa.exame.repo.ExamRepository;
import br.com.dosecerta.dose.certa.exame.repo.ExamResultRepository;
import br.com.dosecerta.dose.certa.exame.storage.ExamStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Pipeline de processamento: extracao -> parsing -> normalizacao -> persistencia -> comparacao deterministica.
 * Nunca marca o exame como PROCESSED se alguma etapa falhar; limitacoes ficam em {@code processingNotes}.
 */
@Service
public class ExamProcessingService {

    private static final Logger log = LoggerFactory.getLogger(ExamProcessingService.class);

    private final ExamRepository exams;
    private final ExamResultRepository results;
    private final ExamStorage storage;
    private final PdfTextExtractor extractor;
    private final ObjectProvider<OcrEngine> ocr;
    private final LabReportParser parser;
    private final TestNormalizer normalizer;
    private final ReferenceRangeService referenceService;
    private final TransactionTemplate tx;

    public ExamProcessingService(ExamRepository exams, ExamResultRepository results, ExamStorage storage,
                                 PdfTextExtractor extractor, ObjectProvider<OcrEngine> ocr, LabReportParser parser,
                                 TestNormalizer normalizer, ReferenceRangeService referenceService,
                                 PlatformTransactionManager txManager) {
        this.exams = exams;
        this.results = results;
        this.storage = storage;
        this.extractor = extractor;
        this.ocr = ocr;
        this.parser = parser;
        this.normalizer = normalizer;
        this.referenceService = referenceService;
        this.tx = new TransactionTemplate(txManager);
    }

    /** Processa o exame; falhas resultam em status ERROR (sem propagar). */
    public void process(Long examId) {
        String storageKey = tx.execute(s -> {
            Exam e = exams.findById(examId).orElseThrow(() ->
                    new ExamException(HttpStatus.NOT_FOUND, "EXAM_NOT_FOUND", "Exame nao encontrado."));
            e.setStatus(ExamStatus.PROCESSING);
            e.setErrorMessage(null);
            exams.save(e);
            return e.getStorageKey();
        });
        try {
            byte[] pdf = storage.load(storageKey);
            ExtractedDocument doc = extractor.extract(pdf);
            if (doc.textless()) {
                OcrEngine engine = ocr.getIfAvailable();
                doc = engine == null ? null : engine.recognize(pdf).filter(d -> !d.textless()).orElse(null);
                if (doc == null) {
                    throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "OCR_REQUIRED",
                            "O PDF nao possui texto incorporado (provavelmente escaneado) e o OCR nao esta disponivel.");
                }
            }
            ParsedReport report = parser.parse(doc);
            if (report.results().stream().noneMatch(r -> !r.historical())) {
                throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "NO_RESULTS_FOUND",
                        "Nenhum resultado laboratorial identificavel no documento.");
            }
            tx.executeWithoutResult(s -> persist(examId, report));
        } catch (ExamException e) {
            log.warn("Processamento do exame id={} falhou: codigo={}", examId, e.getCode());
            fail(examId, e.getMessage());
        } catch (Exception e) {
            log.error("Processamento do exame id={} falhou com erro inesperado: {}", examId, e.getClass().getSimpleName());
            fail(examId, "Falha inesperada no processamento do documento.");
        }
    }

    private void persist(Long examId, ParsedReport report) {
        Exam exam = exams.findById(examId).orElseThrow();
        Paciente patient = exam.getPaciente();
        Integer age = patient.getIdade() > 0 ? patient.getIdade() : null;

        exam.setLaboratory(report.laboratory());
        exam.setCollectionDate(report.collectionDate());
        exam.setReleaseDate(report.releaseDate());
        results.deleteByExamId(examId);
        results.flush();

        int review = 0;
        List<ExamResult> toSave = new ArrayList<>();
        List<ParsedResult> deduplicatedResults = deduplicate(report.results());
        for (ParsedResult pr : deduplicatedResults) {
            ExamResult r = new ExamResult();
            r.setExam(exam);
            r.setOriginalName(truncate(pr.name(), 200));
            r.setTextValue(truncate(pr.valueText(), 100));
            r.setNumericValue(pr.numericValue());
            r.setOriginalUnit(truncate(pr.unit(), 50));
            r.setReferenceText(truncate(pr.referenceText(), 500));
            r.setSourcePage(pr.page());
            r.setSourceSnippet(pr.snippet());
            r.setConfidence(pr.confidence());
            r.setQualitative(pr.qualitative());
            r.setHistorical(pr.historical());
            r.setResultDate(pr.historical() ? pr.date() : report.collectionDate());

            List<String> notes = new ArrayList<>(pr.notes());
            boolean needsReview = pr.needsReview();

            TestInfo info = normalizer.identifyTest(pr.name()).orElse(null);
            if (info != null) {
                r.setTestCode(info.code());
                r.setNormalizedName(info.canonicalName());
            } else {
                needsReview = true;
                notes.add("Exame nao reconhecido no catalogo; sem normalizacao.");
            }
            String canonical = normalizer.canonicalUnit(pr.unit()).orElse(null);
            if (pr.unit() != null && canonical == null) {
                needsReview = true;
                notes.add("Unidade nao reconhecida; valor original preservado.");
            } else if (canonical != null && info != null && !normalizer.unitAllowedFor(info, canonical)) {
                needsReview = true;
                canonical = null;
                notes.add("Unidade inesperada para este exame; nao normalizada.");
            } else if (pr.unit() == null && pr.numericValue() != null && !pr.historical()) {
                needsReview = true;
                notes.add("Unidade ausente.");
            }
            r.setNormalizedUnit(canonical);

            if (pr.historical()) {
                r.setStatus(ResultStatus.NO_REFERENCE);
                r.setStatusJustification("Resultado anterior do quadro comparativo; nao avaliado contra referencia.");
            } else {
                Evaluation ev = referenceService.evaluate(new ReferenceRangeService.EvalInput(
                        r.getTestCode(), r.getNumericValue(), r.getTextValue(), r.getNormalizedUnit(),
                        r.getReferenceText(), age, exam.getSex(), report.collectionDate()));
                r.setStatus(ev.status());
                r.setStatusJustification(truncate(ev.justification(), 600));
                r.setAppliedReference(ev.appliedReference());
                r.setContextReasonCode(ev.contextReasonCode());
                ReferenceBand b = ev.band();
                if (b != null) {
                    r.setRefLower(b.lower());
                    r.setRefLowerOp(b.lowerOp());
                    r.setRefUpper(b.upper());
                    r.setRefUpperOp(b.upperOp());
                }
                if (ev.status() == ResultStatus.NO_REFERENCE || ev.status() == ResultStatus.REQUIRES_CONTEXT) {
                    needsReview = true;
                }
            }
            r.setNeedsReview(needsReview);
            r.setNotes(truncate(String.join(" ", notes), 500));
            if (needsReview) review++;
            toSave.add(r);
        }
        results.saveAll(toSave);

        StringBuilder limits = new StringBuilder();
        if (review > 0) limits.append(review).append(" resultado(s) requerem revisao manual. ");
        for (String w : report.warnings()) limits.append(w).append(' ');
        exam.setProcessingNotes(limits.length() == 0 ? null : truncate(limits.toString().trim(), 1000));
        exam.setStatus(ExamStatus.PROCESSED);
        exam.setErrorMessage(null);
        exams.save(exam);
    }

    /**
     * Deduplica resultados redundantes gerados na extracao do mesmo documento:
     * - Evita duplicar o mesmo analito corrente com o mesmo valor e unidade dentro do laudo (ex: repeticoes de cabecalho de pagina).
     * - Preserva estritamente resultados historicos legitimos (datas diferentes) e analitos diferentes (ex: Glicose vs Glicemia media estimada).
     */
    static List<ParsedResult> deduplicate(List<ParsedResult> raw) {
        if (raw == null || raw.isEmpty()) return List.of();
        List<ParsedResult> out = new ArrayList<>();
        java.util.Set<String> seenCurrent = new java.util.HashSet<>();
        java.util.Set<String> seenHistorical = new java.util.HashSet<>();

        for (ParsedResult r : raw) {
            if (r.historical()) {
                String dateStr = r.date() != null ? r.date().toString() : "SEM_DATA";
                String valStr = r.numericValue() != null ? r.numericValue().stripTrailingZeros().toPlainString() : String.valueOf(r.valueText());
                String key = "HIST|" + r.name().trim().toLowerCase(java.util.Locale.ROOT) + "|" + dateStr + "|" + valStr;
                if (seenHistorical.add(key)) {
                    out.add(r);
                }
            } else {
                String valStr = r.numericValue() != null ? r.numericValue().stripTrailingZeros().toPlainString() : String.valueOf(r.valueText()).trim().toLowerCase(java.util.Locale.ROOT);
                String unitStr = r.unit() != null ? r.unit().trim().toLowerCase(java.util.Locale.ROOT) : "";
                String key = "CURR|" + r.name().trim().toLowerCase(java.util.Locale.ROOT) + "|" + valStr + "|" + unitStr;
                if (seenCurrent.add(key)) {
                    out.add(r);
                } else {
                    log.debug("Omitindo resultado duplicado no mesmo documento: analito={} valor={}", r.name(), valStr);
                }
            }
        }
        return out;
    }

    private void fail(Long examId, String message) {
        tx.executeWithoutResult(s -> exams.findById(examId).ifPresent(e -> {
            e.setStatus(ExamStatus.ERROR);
            e.setErrorMessage(truncate(message, 500));
            exams.save(e);
        }));
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
