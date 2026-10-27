package br.com.dosecerta.dose.certa.exame.model;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.FindingType;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Severity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Observacao individual de uma analise. Nao representa diagnostico. */
@Entity
@Getter
@Setter
@Table(name = "clinical_findings",
        indexes = @Index(name = "idx_clinical_findings_analysis", columnList = "analysis_id"))
public class ClinicalFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private ExamAnalysis analysis;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_result_id")
    private ExamResult examResult;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FindingType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Severity severity;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /** Chaves (AnalysisSource.sourceKey) das fontes recuperadas que sustentam a observacao. */
    @Column(length = 500)
    private String sourceKeys;
}
