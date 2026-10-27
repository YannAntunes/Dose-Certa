package br.com.dosecerta.dose.certa.exame.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/** Meta clinica (distinta de intervalo laboratorial); depende de condicao/contexto clinico. */
@Entity
@Getter
@Setter
@Table(name = "clinical_targets",
        indexes = @Index(name = "idx_clinical_targets_code", columnList = "test_code"))
public class ClinicalTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String testCode;

    @Column(nullable = false, length = 500)
    private String criterion;

    @Column(length = 300)
    private String clinicalCondition;

    @Column(length = 200)
    private String riskCategory;

    @Column(length = 50)
    private String unit;

    @Column(nullable = false, length = 300)
    private String sourceTitle;

    @Column(length = 100)
    private String guidelineVersion;

    private LocalDate validFrom;
    private LocalDate validTo;
}
