package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;

import java.math.BigDecimal;

/**
 * Faixa de referencia aplicavel a um grupo (sexo/idade). Qualquer par de limites pode ser nulo (limite unilateral).
 * Idades inclusivas. {@code dbId}/{@code critical*} so existem para referencias cadastradas.
 */
public record ReferenceBand(Sex sex, Integer ageMin, Integer ageMax,
                            BigDecimal lower, BoundOperator lowerOp,
                            BigDecimal upper, BoundOperator upperOp,
                            Long dbId, String unit, BigDecimal criticalLow, BigDecimal criticalHigh) {

    public static ReferenceBand ofLab(Sex sex, Integer ageMin, Integer ageMax,
                                      BigDecimal lower, BoundOperator lowerOp,
                                      BigDecimal upper, BoundOperator upperOp) {
        return new ReferenceBand(sex, ageMin, ageMax, lower, lowerOp, upper, upperOp, null, null, null, null);
    }
}
