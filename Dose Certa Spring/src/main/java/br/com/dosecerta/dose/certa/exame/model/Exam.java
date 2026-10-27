package br.com.dosecerta.dose.certa.exame.model;

import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Documento laboratorial enviado para um paciente existente. */
@Entity
@Getter
@Setter
@Table(name = "exams",
        indexes = {
                @Index(name = "idx_exams_paciente_coleta", columnList = "paciente_id,collection_date"),
                @Index(name = "idx_exams_status", columnList = "status")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_exams_paciente_hash", columnNames = {"paciente_id", "file_sha256"}))
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    private String laboratory;
    private LocalDate collectionDate;
    private LocalDate releaseDate;

    @Column(nullable = false)
    private String originalFilename;

    /** Chave interna (nao previsivel) no armazenamento; nunca o caminho absoluto. */
    @Column(nullable = false, unique = true)
    private String storageKey;

    @Column(name = "file_sha256", nullable = false, length = 64)
    private String fileSha256;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamStatus status = ExamStatus.UPLOADED;

    /** Sexo informado no upload (contexto autorizado, usado em referencias por sexo). */
    @Enumerated(EnumType.STRING)
    @Column(length = 1)
    private Sex sex;

    @Column(length = 500)
    private String errorMessage;

    /** Limitacoes registradas no processamento (ex.: resultados ambiguos). */
    @Column(length = 1000)
    private String processingNotes;

    @Column(nullable = false, length = 100)
    private String uploadedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
