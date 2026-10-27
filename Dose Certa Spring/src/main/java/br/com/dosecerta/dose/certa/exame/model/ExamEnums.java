package br.com.dosecerta.dose.certa.exame.model;

/** Enumeracoes do modulo de analise de exames. */
public final class ExamEnums {

    private ExamEnums() {}

    public enum ExamStatus { UPLOADED, PROCESSING, PROCESSED, ANALYZED, ERROR }

    public enum AnalysisStatus { PENDING, PROCESSING, COMPLETED, INSUFFICIENT_CONTEXT, ERROR }

    public enum ResultStatus {
        WITHIN_REFERENCE, BELOW_REFERENCE, ABOVE_REFERENCE, CRITICAL, NO_REFERENCE, REQUIRES_CONTEXT
    }

    public enum FindingType {
        WITHIN_REFERENCE, BELOW_REFERENCE, ABOVE_REFERENCE, TREND, REQUIRES_CONTEXT, CLINICAL_CONSIDERATION
    }

    /** Severidade meramente informativa; nao e classificacao clinica. */
    public enum Severity { INFO, ATTENTION, RELEVANT }

    /** Operador de limite: GT/LT exclusivos, GE/LE inclusivos. */
    public enum BoundOperator { GT, GE, LT, LE }

    public enum Sex { M, F }

    public enum ReferenceOrigin { LABORATORY, EXTERNAL_DOCUMENTED }

    /** Categorias estruturadas que justificam por que um analito necessita de contexto clinico. */
    public enum ContextReasonCategory {
        MISSING_PATIENT_INFORMATION,
        MISSING_CLINICAL_HISTORY,
        MEDICATION_CONTEXT_NEEDED,
        MISSING_COLLECTION_CONDITIONS,
        CONFLICTING_REFERENCE_RANGES,
        UNIT_AMBIGUITY,
        METHOD_COMPARABILITY_UNKNOWN,
        RESULT_REQUIRES_CLINICAL_CORRELATION,
        INSUFFICIENT_EVIDENCE
    }
}
