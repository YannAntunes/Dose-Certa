package br.com.dosecerta.dose.certa.exame.ai;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * Recuperador vazio: RAG NAO implementado. Garante que nenhuma fonte seja inventada.
 * Uma implementacao real de {@link KnowledgeRetriever} deve substituir esta classe.
 */
@Component
public class NoKnowledgeRetriever implements KnowledgeRetriever {

    @Override
    public List<RetrievedSource> retrieve(Collection<String> testCodes) {
        return List.of();
    }
}
