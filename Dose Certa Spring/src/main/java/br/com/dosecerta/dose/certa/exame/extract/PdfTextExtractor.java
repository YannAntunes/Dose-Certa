package br.com.dosecerta.dose.certa.exame.extract;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Extracao de texto incorporado com Apache PDFBox. Nao realiza OCR. */
@Component
public class PdfTextExtractor {

    /** Minimo de caracteres nao brancos por pagina, em media, para considerar que ha texto. */
    private static final int MIN_CHARS_PER_PAGE = 20;

    private final int maxPages;

    public PdfTextExtractor(ExamModuleProperties props) {
        this.maxPages = props.upload().maxPages();
    }

    public ExtractedDocument extract(byte[] pdf) {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            int n = doc.getNumberOfPages();
            if (n == 0) {
                throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PDF", "O PDF nao possui paginas.");
            }
            if (n > maxPages) {
                throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TOO_LONG",
                        "O PDF excede o limite de " + maxPages + " paginas.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            List<String> pages = new ArrayList<>(n);
            long chars = 0;
            for (int p = 1; p <= n; p++) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String text = stripper.getText(doc);
                chars += text.chars().filter(c -> !Character.isWhitespace(c)).count();
                pages.add(text);
            }
            return new ExtractedDocument(pages, chars < (long) MIN_CHARS_PER_PAGE * n);
        } catch (InvalidPasswordException e) {
            throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_ENCRYPTED",
                    "O PDF esta protegido por senha.");
        } catch (IOException e) {
            throw new ExamException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PDF",
                    "Nao foi possivel ler o PDF (arquivo corrompido ou invalido).");
        }
    }
}
