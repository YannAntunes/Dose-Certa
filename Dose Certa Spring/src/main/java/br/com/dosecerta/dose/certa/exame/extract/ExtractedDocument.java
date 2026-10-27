package br.com.dosecerta.dose.certa.exame.extract;

import java.util.List;

/**
 * Texto extraido de um PDF, por pagina (indice 0 = pagina 1).
 *
 * @param textless verdadeiro quando quase nao ha texto incorporado (provavel PDF escaneado; requer OCR)
 */
public record ExtractedDocument(List<String> pages, boolean textless) {}
