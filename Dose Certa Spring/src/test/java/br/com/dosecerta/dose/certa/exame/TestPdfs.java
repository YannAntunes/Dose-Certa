package br.com.dosecerta.dose.certa.exame;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/** Gera PDFs sinteticos (nenhum dado real) para testes. */
public final class TestPdfs {

    private TestPdfs() {}

    public static byte[] textPdf(List<String> lines) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 10);
                cs.setLeading(14);
                cs.newLineAtOffset(40, 780);
                for (String l : lines) {
                    cs.showText(l);
                    cs.newLine();
                }
                cs.endText();
            }
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** PDF valido sem nenhum texto (equivalente a um documento escaneado sem camada de texto). */
    public static byte[] blankPdf() {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static byte[] labReport(String collectionDate, String glucose, long unique) {
        return textPdf(List.of(
                "Laboratorio: Laboratorio Sintetico de Teste",
                "Data da coleta: " + collectionDate,
                "Liberado em: " + collectionDate,
                "Hemoglobina 14,2 g/dL 12,0 a 16,0",
                "Glicemia de jejum " + glucose + " mg/dL 70 a 99",
                "Colesterol Total 210 mg/dL < 200",
                "Creatinina 0,9 mg/dL 0,5 a 1,3",
                "Leucocitos 7.500 /mm3 4.000 a 11.000",
                "Protocolo " + unique));
    }
}
