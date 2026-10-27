package br.com.dosecerta.dose.certa.exame.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** DTOs da API de exames. */
public final class ExamDtos {

    private ExamDtos() {}

    public record ExamSummary(Long id, Long patientId, String laboratory, LocalDate collectionDate,
                              LocalDate releaseDate, String originalFilename, String status,
                              String errorMessage, String processingNotes, long resultCount,
                              LocalDateTime createdAt, LocalDateTime updatedAt) {}

    public record ResultDto(Long id, String testCode, String originalName, String normalizedName,
                            BigDecimal numericValue, String textValue, String originalUnit, String normalizedUnit,
                            String referenceText, BigDecimal refLower, String refLowerOp,
                            BigDecimal refUpper, String refUpperOp, String status, String statusJustification,
                            String appliedReference, String contextReasonCode, Integer sourcePage, double confidence, boolean needsReview,
                            boolean qualitative, boolean historical, LocalDate resultDate, String notes) {}

    public record ExamDetail(ExamSummary exam, List<ResultDto> results) {}

    public record FindingDto(Long id, Long resultId, String type, String severity, String title,
                             String description, List<String> sourceKeys) {}

    public record SourceDto(String sourceKey, String title, String organization, String sourceType,
                            String versionId, String url, String excerpt, String locator,
                            LocalDateTime accessedAt) {}

    public record AnalysisDto(Long id, Long examId, String status, String summary, String clinicalContext, List<String> warnings,
                              String modelId, String contractVersion, String errorMessage,
                              LocalDateTime createdAt, LocalDateTime completedAt,
                              List<FindingDto> findings, List<SourceDto> sources, String disclaimer) {}

    public record ExamAnalysisRequest(String clinicalContext) {}

    public record AnalyteEvolutionPoint(Long examId, Long resultId, LocalDate date, BigDecimal value,
                                        String textValue, String unit, String status, String laboratory) {}

    public record AnalyteEvolutionSeries(String testCode, String canonicalName, String unit,
                                         BigDecimal refLower, BigDecimal refUpper, String referenceSource,
                                         List<AnalyteEvolutionPoint> points, boolean hasSufficientData) {}

    public record ErrorDto(int status, String error, String message, boolean recoverable, LocalDateTime timestamp) {}
}
