package br.com.dosecerta.dose.certa.exame.norm;

import br.com.dosecerta.dose.certa.exame.norm.TestNormalizer.TestInfo;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TestNormalizerTest {

    private final TestNormalizer n = new TestNormalizer();

    @Test
    void aliasesMapToSameCodeButOriginalNameIsNotAltered() {
        assertEquals("AST", n.identifyTest("TGO (AST)").map(TestInfo::code).orElseThrow());
        assertEquals("AST", n.identifyTest("AST").map(TestInfo::code).orElseThrow());
        assertEquals("ALT", n.identifyTest("TGP/ALT").map(TestInfo::code).orElseThrow());
        assertEquals("GLUCOSE", n.identifyTest("Glicemia de Jejum").map(TestInfo::code).orElseThrow());
    }

    @Test
    void similarButDifferentNamesAreNotMerged() {
        assertEquals("HEMOGLOBIN", n.identifyTest("Hemoglobina").map(TestInfo::code).orElseThrow());
        assertEquals("HBA1C", n.identifyTest("Hemoglobina Glicada").map(TestInfo::code).orElseThrow());
        assertEquals("GLUCOSE", n.identifyTest("Glicose de Jejum").map(TestInfo::code).orElseThrow());
        assertEquals("ESTIMATED_AVERAGE_GLUCOSE", n.identifyTest("Glicemia média estimada (eAG)").map(TestInfo::code).orElseThrow());
        assertNotEquals(
                n.identifyTest("Glicose").map(TestInfo::code).orElseThrow(),
                n.identifyTest("Glicemia média estimada").map(TestInfo::code).orElseThrow(),
                "Glicose e Glicemia média estimada (eAG) não podem ser fundidas"
        );
        assertTrue(n.identifyTest("Hemoglobina fetal").isEmpty());
        assertTrue(n.identifyTest("Colesterol").isEmpty());
    }

    @Test
    void expandedAnalytesAreRecognizedWithCorrectCodes() {
        assertEquals("ALBUMIN", n.identifyTest("Albumina").map(TestInfo::code).orElseThrow());
        assertEquals("CALCIUM", n.identifyTest("Cálcio Total").map(TestInfo::code).orElseThrow());
        assertEquals("FERRITIN", n.identifyTest("Ferritina").map(TestInfo::code).orElseThrow());
        assertEquals("VITAMIN_D", n.identifyTest("Vitamina D 25-OH").map(TestInfo::code).orElseThrow());
        assertEquals("VITAMIN_B12", n.identifyTest("Vitamina B12").map(TestInfo::code).orElseThrow());
        assertEquals("URIC_ACID", n.identifyTest("Ácido Úrico").map(TestInfo::code).orElseThrow());
        assertEquals("CRP", n.identifyTest("Proteína C Reativa").map(TestInfo::code).orElseThrow());
        assertEquals("VHS", n.identifyTest("Velocidade de Hemossedimentação").map(TestInfo::code).orElseThrow());
    }

    @Test
    void unitsAreCanonicalizedOnlyWhenKnown() {
        assertEquals("mg/dL", n.canonicalUnit("MG/DL").orElseThrow());
        assertEquals("/mm\u00b3", n.canonicalUnit("/mm3").orElseThrow());
        assertEquals("U/L", n.canonicalUnit("UI/L").orElseThrow());
        assertTrue(n.canonicalUnit("xyz/abc").isEmpty());
        // mg/dL e mmol/L continuam distintas: nenhuma conversao implementada
        assertNotEquals(n.canonicalUnit("mg/dL"), n.canonicalUnit("mmol/L"));
    }

    @Test
    void unexpectedUnitForAnalyteIsDetected() {
        TestInfo glucose = n.identifyTest("Glicose").orElseThrow();
        assertTrue(n.unitAllowedFor(glucose, "mg/dL"));
        assertFalse(n.unitAllowedFor(glucose, "U/L"));
    }
}
