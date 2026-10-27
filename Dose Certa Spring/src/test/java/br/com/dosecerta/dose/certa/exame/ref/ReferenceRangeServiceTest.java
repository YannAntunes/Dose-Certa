package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.model.ReferenceRange;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceRangeService.EvalInput;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceRangeService.Evaluation;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ReferenceRangeServiceTest {

    private final ReferenceRangeService service = new ReferenceRangeService(null);

    private static EvalInput num(String v, String unit, String ref, Integer age, Sex sex) {
        return new EvalInput("GLUCOSE", new BigDecimal(v), null, unit, ref, age, sex, LocalDate.of(2024, 3, 12));
    }

    private Evaluation eval(String v, String ref) {
        return service.evaluate(num(v, "mg/dL", ref, 40, null), List.of());
    }

    private static ReferenceRange range(String lo, String hi, String unit, Sex sex, Integer ageMin, Integer ageMax) {
        ReferenceRange r = new ReferenceRange();
        r.setTestCode("GLUCOSE");
        r.setUnit(unit);
        if (lo != null) { r.setLowerBound(new BigDecimal(lo)); r.setLowerOp(BoundOperator.GE); }
        if (hi != null) { r.setUpperBound(new BigDecimal(hi)); r.setUpperOp(BoundOperator.LE); }
        r.setSex(sex);
        r.setAgeMinYears(ageMin);
        r.setAgeMaxYears(ageMax);
        r.setSourceTitle("Fonte sintetica de teste");
        return r;
    }

    @Test
    void inclusiveLowerAndUpperLimits() {
        assertEquals(ResultStatus.WITHIN_REFERENCE, eval("70", "70 a 99").status());
        assertEquals(ResultStatus.WITHIN_REFERENCE, eval("99", "70 a 99").status());
        assertEquals(ResultStatus.BELOW_REFERENCE, eval("69.9", "70 a 99").status());
        assertEquals(ResultStatus.ABOVE_REFERENCE, eval("99.1", "70 a 99").status());
    }

    @Test
    void exclusiveUpperLimit() {
        assertEquals(ResultStatus.ABOVE_REFERENCE, eval("200", "< 200").status());
        assertEquals(ResultStatus.WITHIN_REFERENCE, eval("199", "< 200").status());
        assertEquals(ResultStatus.WITHIN_REFERENCE, eval("200", "<= 200").status());
    }

    @Test
    void exclusiveAndInclusiveLowerLimit() {
        assertEquals(ResultStatus.BELOW_REFERENCE, eval("40", "> 40").status());
        assertEquals(ResultStatus.WITHIN_REFERENCE, eval("40", ">= 40").status());
    }

    @Test
    void unilateralLimitsDoNotInventTheOtherBound() {
        Evaluation e = eval("5", "< 200");
        assertEquals(ResultStatus.WITHIN_REFERENCE, e.status());
        assertNull(e.band().lower());
    }

    @Test
    void laboratoryReferenceBySex() {
        String ref = "Homens: 13,5 a 17,5 Mulheres: 12,0 a 16,0";
        assertEquals(ResultStatus.WITHIN_REFERENCE, service.evaluate(num("13.0", "mg/dL", ref, 40, Sex.F), List.of()).status());
        assertEquals(ResultStatus.BELOW_REFERENCE, service.evaluate(num("13.0", "mg/dL", ref, 40, Sex.M), List.of()).status());
        assertEquals(ResultStatus.REQUIRES_CONTEXT, service.evaluate(num("13.0", "mg/dL", ref, 40, null), List.of()).status());
    }

    @Test
    void registeredReferenceByAgeAndSex() {
        List<ReferenceRange> db = List.of(
                range("60", "100", "mg/dL", null, 0, 17),
                range("70", "99", "mg/dL", null, 18, 120));
        Evaluation adult = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("65"), null, "mg/dL", null, 30, null, LocalDate.of(2024, 3, 12)), db);
        assertEquals(ResultStatus.BELOW_REFERENCE, adult.status());
        Evaluation child = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("65"), null, "mg/dL", null, 10, null, LocalDate.of(2024, 3, 12)), db);
        assertEquals(ResultStatus.WITHIN_REFERENCE, child.status());
        Evaluation unknownAge = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("65"), null, "mg/dL", null, null, null, LocalDate.of(2024, 3, 12)), db);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, unknownAge.status());
    }

    @Test
    void incompatibleUnitRequiresContext() {
        List<ReferenceRange> db = List.of(range("70", "99", "mg/dL", null, null, null));
        Evaluation e = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("5"), null, "mmol/L", null, 40, null, LocalDate.of(2024, 3, 12)), db);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, e.status());
        assertNull(e.band());
    }

    @Test
    void absenceOfReferenceIsNeverNormal() {
        Evaluation e = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("90"), null, "mg/dL", null, 40, null, LocalDate.of(2024, 3, 12)), List.of());
        assertEquals(ResultStatus.NO_REFERENCE, e.status());
    }

    @Test
    void multipleCandidatesAreNotChosenArbitrarily() {
        List<ReferenceRange> db = List.of(
                range("70", "99", "mg/dL", null, null, null),
                range("60", "110", "mg/dL", null, null, null));
        Evaluation e = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("90"), null, "mg/dL", null, 40, null, LocalDate.of(2024, 3, 12)), db);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, e.status());
    }

    @Test
    void ambiguousLaboratoryReferenceIsNotReplacedByRegisteredOne() {
        List<ReferenceRange> db = List.of(range("70", "99", "mg/dL", null, null, null));
        Evaluation e = service.evaluate(
                num("90", "mg/dL", "Desejavel: < 200 Limitrofe: 200 a 239", 40, null), db);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, e.status());
        assertEquals("METHOD_COMPARABILITY_UNKNOWN", e.contextReasonCode());
        assertNotNull(e.justification());
    }

    @Test
    void missingDemographicInformationReturnsStructuredReasonCode() {
        ReferenceRange maleOnly = range("13.0", "17.5", "g/dL", Sex.M, 18, 120);
        ReferenceRange femaleOnly = range("12.0", "15.5", "g/dL", Sex.F, 18, 120);
        List<ReferenceRange> db = List.of(maleOnly, femaleOnly);

        // Paciente sem sexo informado -> MISSING_PATIENT_INFORMATION
        Evaluation e = service.evaluate(
                new EvalInput("HEMOGLOBIN", new BigDecimal("14.0"), null, "g/dL", null, 35, null, LocalDate.now()),
                db);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, e.status());
        assertEquals("MISSING_PATIENT_INFORMATION", e.contextReasonCode());
        assertTrue(e.justification().contains("sexo"));
    }

    @Test
    void unitMismatchReturnsStructuredUnitAmbiguityReasonCode() {
        ReferenceRange dbRange = range("70", "99", "mg/dL", null, null, null);
        Evaluation e = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("5.0"), null, "mmol/L", null, 35, Sex.M, LocalDate.now()),
                List.of(dbRange));
        assertEquals(ResultStatus.REQUIRES_CONTEXT, e.status());
        assertEquals("UNIT_AMBIGUITY", e.contextReasonCode());
    }

    @Test
    void qualitativeResults() {
        EvalInput same = new EvalInput("HIV", null, "Nao reagente", null, "Nao reagente", 40, null, null);
        assertEquals(ResultStatus.WITHIN_REFERENCE, service.evaluate(same, List.of()).status());
        EvalInput diff = new EvalInput("HIV", null, "Reagente", null, "Nao reagente", 40, null, null);
        assertEquals(ResultStatus.REQUIRES_CONTEXT, service.evaluate(diff, List.of()).status());
        EvalInput none = new EvalInput("HIV", null, "Reagente", null, null, 40, null, null);
        assertEquals(ResultStatus.NO_REFERENCE, service.evaluate(none, List.of()).status());
    }

    @Test
    void criticalOnlyWithDocumentedCriticalLimits() {
        // referencia do laboratorio sozinha nunca gera CRITICAL
        assertEquals(ResultStatus.ABOVE_REFERENCE, eval("500", "< 200").status());

        ReferenceRange documented = range(null, "200", "mg/dL", null, null, null);
        documented.setCriticalHigh(new BigDecimal("400"));
        Evaluation viaDb = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("500"), null, "mg/dL", null, 40, null, LocalDate.of(2024, 3, 12)),
                List.of(documented));
        assertEquals(ResultStatus.CRITICAL, viaDb.status());

        Evaluation labPlusDb = service.evaluate(num("500", "mg/dL", "< 200", 40, null), List.of(documented));
        assertEquals(ResultStatus.CRITICAL, labPlusDb.status());

        Evaluation belowCritical = service.evaluate(num("300", "mg/dL", "< 200", 40, null), List.of(documented));
        assertEquals(ResultStatus.ABOVE_REFERENCE, belowCritical.status());
    }

    @Test
    void expiredRegisteredReferenceIsIgnored() {
        ReferenceRange old = range("70", "99", "mg/dL", null, null, null);
        old.setValidTo(LocalDate.of(2020, 1, 1));
        Evaluation e = service.evaluate(
                new EvalInput("GLUCOSE", new BigDecimal("90"), null, "mg/dL", null, 40, null, LocalDate.of(2024, 3, 12)),
                List.of(old));
        assertEquals(ResultStatus.NO_REFERENCE, e.status());
    }
}
