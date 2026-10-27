package br.com.dosecerta.dose.certa.exame.model;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ReferenceOrigin;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Intervalo de referencia documentado e versionado (fonte obrigatoria).
 * Faixa etaria: limites inclusivos. Limites criticos so existem quando documentados na fonte.
 */
@Entity
@Getter
@Setter
@Table(name = "reference_ranges",
        indexes = @Index(name = "idx_reference_ranges_code", columnList = "test_code"))
public class ReferenceRange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String testCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReferenceOrigin origin = ReferenceOrigin.EXTERNAL_DOCUMENTED;

    /** Laboratorio ao qual a referencia pertence, quando for referencia de laboratorio. */
    @Column(length = 200)
    private String laboratory;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(precision = 19, scale = 6)
    private BigDecimal lowerBound;
    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private BoundOperator lowerOp;
    @Column(precision = 19, scale = 6)
    private BigDecimal upperBound;
    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private BoundOperator upperOp;

    /** Limites criticos documentados (opcional). Valor abaixo/acima => CRITICAL. */
    @Column(precision = 19, scale = 6)
    private BigDecimal criticalLow;
    @Column(precision = 19, scale = 6)
    private BigDecimal criticalHigh;

    @Enumerated(EnumType.STRING)
    @Column(length = 1)
    private Sex sex;

    private Integer ageMinYears;
    private Integer ageMaxYears;

    @Column(length = 500)
    private String conditions;

    @Column(nullable = false, length = 300)
    private String sourceTitle;
    @Column(length = 100)
    private String sourceVersion;
    @Column(length = 500)
    private String sourceUrl;

    private LocalDate validFrom;
    private LocalDate validTo;

    @Column(nullable = false)
    private LocalDateTime registeredAt = LocalDateTime.now();
}
