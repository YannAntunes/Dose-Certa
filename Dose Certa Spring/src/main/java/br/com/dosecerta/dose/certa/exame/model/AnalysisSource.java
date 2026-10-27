package br.com.dosecerta.dose.certa.exame.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Fonte verificada (recuperada de base cadastrada) usada por uma analise. Nunca criada pela IA. */
@Entity
@Getter
@Setter
@Table(name = "analysis_sources",
        indexes = @Index(name = "idx_analysis_sources_analysis", columnList = "analysis_id"))
public class AnalysisSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private ExamAnalysis analysis;

    @Column(nullable = false, length = 100)
    private String sourceKey;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 200)
    private String organization;

    @Column(length = 50)
    private String sourceType;

    @Column(length = 100)
    private String versionId;

    @Column(length = 500)
    private String url;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(length = 100)
    private String locator;

    @Column(nullable = false)
    private LocalDateTime accessedAt = LocalDateTime.now();
}
