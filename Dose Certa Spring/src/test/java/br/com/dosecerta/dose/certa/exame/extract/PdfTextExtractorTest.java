package br.com.dosecerta.dose.certa.exame.extract;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.TestPdfs;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfTextExtractorTest {

    private final PdfTextExtractor extractor = new PdfTextExtractor(new ExamModuleProperties(
            new ExamModuleProperties.Storage("x"), new ExamModuleProperties.Upload(1_000_000, 5),
            new ExamModuleProperties.Gemini("", "m", "http://localhost", 1000, 1000)));

    @Test
    void extractsEmbeddedText() {
        ExtractedDocument doc = extractor.extract(TestPdfs.textPdf(List.of(
                "Hemoglobina 14,2 g/dL 12,0 a 16,0", "Glicemia de jejum 92 mg/dL 70 a 99")));
        assertFalse(doc.textless());
        assertEquals(1, doc.pages().size());
        assertTrue(doc.pages().get(0).contains("Hemoglobina 14,2 g/dL"));
    }

    @Test
    void pdfWithoutTextIsFlaggedAsNeedingOcr() {
        assertTrue(extractor.extract(TestPdfs.blankPdf()).textless());
    }

    @Test
    void corruptedPdfIsRejected() {
        byte[] bad = "%PDF-1.4 lixo que nao e um pdf".getBytes(StandardCharsets.ISO_8859_1);
        ExamException e = assertThrows(ExamException.class, () -> extractor.extract(bad));
        assertEquals("INVALID_PDF", e.getCode());
    }
}
