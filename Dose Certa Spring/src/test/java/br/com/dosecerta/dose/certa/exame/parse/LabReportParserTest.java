package br.com.dosecerta.dose.certa.exame.parse;

import br.com.dosecerta.dose.certa.exame.extract.ExtractedDocument;
import br.com.dosecerta.dose.certa.exame.norm.TestNormalizer;
import br.com.dosecerta.dose.certa.exame.parse.LabReportParser.ParsedReport;
import br.com.dosecerta.dose.certa.exame.parse.LabReportParser.ParsedResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class LabReportParserTest {

    private final LabReportParser parser = new LabReportParser(new TestNormalizer());

    private ParsedReport parse(String... pages) {
        return parser.parse(new ExtractedDocument(List.of(pages), false));
    }

    private static Optional<ParsedResult> find(ParsedReport r, String name) {
        return r.results().stream().filter(x -> x.name().equals(name)).findFirst();
    }

    @Test
    void parsesMetadataAndBasicRowsWithCommaAndDotDecimals() {
        ParsedReport r = parse("""
                Laboratorio: Lab Sintetico Exemplo
                Data da coleta: 12/03/2024
                Liberado em: 13/03/2024
                Hemoglobina 14,2 g/dL 12,0 a 16,0
                Hematocrito 42.5 % 36 - 48
                Glicemia de jejum 92 mg/dL 70 a 99
                """);
        assertEquals("Lab Sintetico Exemplo", r.laboratory());
        assertEquals(LocalDate.of(2024, 3, 12), r.collectionDate());
        assertEquals(LocalDate.of(2024, 3, 13), r.releaseDate());
        ParsedResult hb = find(r, "Hemoglobina").orElseThrow();
        assertEquals(new BigDecimal("14.2"), hb.numericValue());
        assertEquals("g/dL", hb.unit());
        assertEquals("12,0 a 16,0", hb.referenceText());
        assertFalse(hb.needsReview());
        assertEquals(new BigDecimal("42.5"), find(r, "Hematocrito").orElseThrow().numericValue());
        assertEquals("36 - 48", find(r, "Hematocrito").orElseThrow().referenceText());
    }

    @Test
    void thousandsSeparatorAndDifferentUnits() {
        ParsedReport r = parse("""
                Leucocitos 7.500 /mm3 4.000 a 11.000
                Colesterol Total 210 mg/dL < 200
                Sodio 140 mEq/L 135 a 145
                """);
        assertEquals(new BigDecimal("7500"), find(r, "Leucocitos").orElseThrow().numericValue());
        assertEquals("/mm3", find(r, "Leucocitos").orElseThrow().unit());
        assertEquals("< 200", find(r, "Colesterol Total").orElseThrow().referenceText());
        assertEquals("mEq/L", find(r, "Sodio").orElseThrow().unit());
    }

    @Test
    void referenceBySexOnFollowingLinesIsAttachedToPreviousResult() {
        ParsedReport r = parse("""
                Creatinina 0,9 mg/dL
                Homens: 0,7 a 1,3
                Mulheres: 0,5 a 1,1
                """);
        String ref = find(r, "Creatinina").orElseThrow().referenceText();
        assertTrue(ref.contains("Homens") && ref.contains("Mulheres"), ref);
    }

    @Test
    void referenceByAgeRangeKeptAsOriginalText() {
        ParsedReport r = parse("""
                Hemoglobina 13,1 g/dL
                Referencia: 1 a 12 anos: 11,5 a 14,5
                """);
        assertTrue(find(r, "Hemoglobina").orElseThrow().referenceText().contains("anos"));
    }

    @Test
    void brokenLinesAreJoinedWithReducedConfidence() {
        ParsedReport r = parse("""
                Plaquetas
                250.000 /mm3 150.000 a 450.000
                """);
        ParsedResult p = find(r, "Plaquetas").orElseThrow();
        assertEquals(new BigDecimal("250000"), p.numericValue());
        assertTrue(p.confidence() < 0.95);
        assertTrue(p.notes().stream().anyMatch(n -> n.contains("quebradas")));
    }

    @Test
    void missingValuesAreNotInvented() {
        ParsedReport r = parse("""
                Colesterol HDL
                Colesterol LDL --
                Hemoglobina 14,2 g/dL 12,0 a 16,0
                """);
        assertEquals(1, r.results().size());
        assertTrue(find(r, "Colesterol HDL").isEmpty());
        assertTrue(find(r, "Colesterol LDL").isEmpty());
    }

    @Test
    void ambiguousNumericSequenceIsFlaggedForReview() {
        ParsedReport r = parse("Hemoglobina 14,2 13,0");
        ParsedResult p = find(r, "Hemoglobina").orElseThrow();
        assertTrue(p.needsReview());
        assertTrue(p.confidence() <= 0.3);
    }

    @Test
    void qualitativeResults() {
        ParsedReport r = parse("""
                HIV Nao reagente Nao reagente
                Urina Tipo 1 Positivo
                """);
        ParsedResult hiv = find(r, "HIV").orElseThrow();
        assertTrue(hiv.qualitative());
        assertNull(hiv.numericValue());
        assertEquals("Nao reagente", hiv.valueText());
        assertEquals("Nao reagente", hiv.referenceText());
    }

    @Test
    void censoredValueIsNotParsedAsNumber() {
        ParsedReport r = parse("Hemoglobina < 0,5 g/dL");
        ParsedResult p = find(r, "Hemoglobina").orElseThrow();
        assertNull(p.numericValue());
        assertTrue(p.needsReview());
    }

    @Test
    void historicalTableProducesHistoricalResultsWithoutDuplicatingCurrent() {
        ParsedReport r = parse("""
                Data da coleta: 12/03/2024
                Hemoglobina 14,2 g/dL 12,0 a 16,0
                Quadro comparativo
                Exame 10/01/2023 12/03/2024
                Glicemia de jejum 98 92
                """);
        List<ParsedResult> hist = r.results().stream().filter(ParsedResult::historical).toList();
        assertEquals(1, hist.size());
        assertEquals(LocalDate.of(2023, 1, 10), hist.get(0).date());
        assertEquals(new BigDecimal("98"), hist.get(0).numericValue());
        assertNull(hist.get(0).unit());
        assertTrue(hist.get(0).needsReview());
    }

    @Test
    void headerAndNoiseLinesAreNotResults() {
        ParsedReport r = parse("""
                Pagina 3 de 14
                Paciente: Fulano 40 anos
                Telefone 11 99999 8888
                CRM 123456 SP
                """);
        assertTrue(r.results().isEmpty());
    }

    @Test
    void documentWithoutResultsYieldsEmptyList() {
        assertTrue(parse("Texto qualquer sem resultados").results().isEmpty());
    }
}
