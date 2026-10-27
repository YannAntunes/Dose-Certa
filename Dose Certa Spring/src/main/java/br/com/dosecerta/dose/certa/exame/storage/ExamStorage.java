package br.com.dosecerta.dose.certa.exame.storage;

/** Abstracao de armazenamento de arquivos; permite trocar o disco local por object storage. */
public interface ExamStorage {

    /** Armazena o conteudo e devolve uma chave interna opaca. */
    String store(byte[] content);

    byte[] load(String key);

    void delete(String key);
}
