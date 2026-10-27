package br.com.dosecerta.dose.certa.exame.model;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.AnalysisStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Uma execucao de analise sobre um exame. Execucoes anteriores sao preservadas. */
@Entity
@Getter
@Setter
@Table(name = "exam_analyses",
        indexes = @Index(name = "idx_exam_analyses_exam", columnList = "exam_id,created_at"))
public class ExamAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private AnalysisStatus status = AnalysisStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** Contexto clinico adicional fornecido pelo profissional de saude antes da analise. */
    @Column(columnDefinition = "TEXT")
    private String clinicalContext;

    /** Avisos retornados pela IA, um por linha. */
    @Column(columnDefinition = "TEXT")
    private String warnings;

    @Column(length = 100)
    private String modelId;

    @Column(length = 50)
    private String contractVersion;

    @Column(length = 500)
    private String errorMessage;

    @Column(nullable = false, length = 100)
    private String requestedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime completedAt;
}
