package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceTextParser.Parsed;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ReferenceTextParserTest {

    @Test
    void range() {
        Parsed p = ReferenceTextParser.parse("12,0 a 16,0 g/dL");
        ReferenceBand b = p.bands().get(0);
        assertEquals(new BigDecimal("12.0"), b.lower());
        assertEquals(BoundOperator.GE, b.lowerOp());
        assertEquals(new BigDecimal("16.0"), b.upper());
        assertEquals(BoundOperator.LE, b.upperOp());
    }

    @Test
    void thousandsSeparator() {
        ReferenceBand b = ReferenceTextParser.parse("4.000 a 11.000").bands().get(0);
        assertEquals(new BigDecimal("4000"), b.lower());
        assertEquals(new BigDecimal("11000"), b.upper());
    }

    @Test
    void operators() {
        assertEquals(BoundOperator.LT, ReferenceTextParser.parse("< 200").bands().get(0).upperOp());
        assertEquals(BoundOperator.LE, ReferenceTextParser.parse("<= 200").bands().get(0).upperOp());
        assertEquals(BoundOperator.LE, ReferenceTextParser.parse("ate 200").bands().get(0).upperOp());
        assertEquals(BoundOperator.GT, ReferenceTextParser.parse("> 40").bands().get(0).lowerOp());
        assertEquals(BoundOperator.GE, ReferenceTextParser.parse(">= 40").bands().get(0).lowerOp());
        assertEquals(BoundOperator.GT, ReferenceTextParser.parse("Superior a 40").bands().get(0).lowerOp());
    }

    @Test
    void sexBands() {
        Parsed p = ReferenceTextParser.parse("Homens: 13,5 a 17,5 Mulheres: 12,0 a 16,0");
        assertEquals(2, p.bands().size());
        assertEquals(Sex.M, p.bands().get(0).sex());
        assertEquals(Sex.F, p.bands().get(1).sex());
    }

    @Test
    void ageBands() {
        Parsed p = ReferenceTextParser.parse("1 a 12 anos: 11,5 a 14,5 13 a 120 anos: 12,0 a 16,0");
        assertFalse(p.ambiguous());
        assertEquals(2, p.bands().size());
        assertEquals(1, p.bands().get(0).ageMin());
        assertEquals(12, p.bands().get(0).ageMax());
    }

    @Test
    void multiCriteriaTextIsAmbiguous() {
        assertTrue(ReferenceTextParser.parse("Desejavel: < 200 Limitrofe: 200 a 239 Alto: >= 240").ambiguous());
        assertTrue(ReferenceTextParser.parse("Adultos: 12 a 16").ambiguous());
    }

    @Test
    void unknownFormatIsAmbiguousAndBlankIsNone() {
        assertTrue(ReferenceTextParser.parse("conforme protocolo").ambiguous());
        Parsed none = ReferenceTextParser.parse("  ");
        assertFalse(none.ambiguous());
        assertTrue(none.bands().isEmpty());
    }
}
