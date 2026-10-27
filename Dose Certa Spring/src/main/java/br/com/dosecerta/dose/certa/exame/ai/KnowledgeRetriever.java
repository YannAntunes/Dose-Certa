package br.com.dosecerta.dose.certa.exame.ai;

import java.util.Collection;
import java.util.List;

/**
 * Ponto de extensao do RAG. A implementacao padrao nao recupera nada (nao ha base de conhecimento);
 * uma implementacao real deve retornar apenas trechos de documentos cadastrados e verificaveis.
 */
public interface KnowledgeRetriever {

    record RetrievedSource(String key, String title, String organization, String sourceType, String versionId,
                           String url, String excerpt, String locator) {}

    List<RetrievedSource> retrieve(Collection<String> testCodes);
}
