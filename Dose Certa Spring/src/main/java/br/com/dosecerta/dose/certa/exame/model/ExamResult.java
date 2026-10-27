package br.com.dosecerta.dose.certa.exame.model;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Resultado laboratorial individual (numerico ou qualitativo). Preserva o texto original. */
@Entity
@Getter
@Setter
@Table(name = "exam_results",
        indexes = {
                @Index(name = "idx_exam_results_exam", columnList = "exam_id"),
                @Index(name = "idx_exam_results_code_date", columnList = "test_code,result_date")
        })
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    /** Codigo interno normalizado; nulo quando nao ha correspondencia segura. */
    @Column(length = 40)
    private String testCode;

    @Column(nullable = false, length = 200)
    private String originalName;

    @Column(length = 200)
    private String normalizedName;

    @Column(precision = 19, scale = 6)
    private BigDecimal numericValue;

    @Column(length = 100)
    private String textValue;

    @Column(length = 50)
    private String originalUnit;

    @Column(length = 50)
    private String normalizedUnit;

    @Column(length = 500)
    private String referenceText;

    @Column(precision = 19, scale = 6)
    private BigDecimal refLower;
    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private BoundOperator refLowerOp;
    @Column(precision = 19, scale = 6)
    private BigDecimal refUpper;
    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private BoundOperator refUpperOp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultStatus status = ResultStatus.NO_REFERENCE;

    @Column(length = 600)
    private String statusJustification;

    /** Categoria estruturada quando status = REQUIRES_CONTEXT (ex: MISSING_PATIENT_INFORMATION). */
    @Column(length = 60)
    private String contextReasonCode;

    /** "LABORATORY" ou "REFERENCE_RANGE:{id}". */
    @Column(length = 60)
    private String appliedReference;

    private Integer sourcePage;

    @Column(length = 300)
    private String sourceSnippet;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false)
    private boolean needsReview;

    @Column(nullable = false)
    private boolean qualitative;

    /** Verdadeiro para valores anteriores extraidos de quadro comparativo do mesmo relatorio. */
    @Column(nullable = false)
    private boolean historical;

    /** Data do resultado (coleta do exame, ou data da coluna no quadro historico). */
    private LocalDate resultDate;

    /** Notas de extracao (ambiguidades etc.). */
    @Column(length = 500)
    private String notes;
}
