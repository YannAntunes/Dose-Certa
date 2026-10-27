package br.com.dosecerta.dose.certa.exame.extract;

import java.util.Optional;

/**
 * Ponto de extensao para OCR de PDFs escaneados. NAO existe implementacao nesta versao:
 * sem um bean deste tipo, PDFs sem texto sao rejeitados com o codigo OCR_REQUIRED.
 */
public interface OcrEngine {
    Optional<ExtractedDocument> recognize(byte[] pdf);
}
