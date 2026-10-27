package br.com.dosecerta.dose.certa.exame.storage;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import java.util.regex.Pattern;

/** Armazenamento em disco local, fora de diretorios publicos, com chaves aleatorias. */
@Component
public class LocalExamStorage implements ExamStorage {

    private static final Pattern KEY = Pattern.compile("^[0-9a-f\\-]{36}\\.pdf$");
    private final Path root;

    public LocalExamStorage(ExamModuleProperties props) {
        this.root = Path.of(props.storage().dir()).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] content) {
        String key = UUID.randomUUID() + ".pdf";
        try {
            Files.createDirectories(root);
            Files.write(resolve(key), content, StandardOpenOption.CREATE_NEW);
            return key;
        } catch (IOException e) {
            throw new ExamException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILURE",
                    "Falha ao armazenar o arquivo.", true);
        }
    }

    @Override
    public byte[] load(String key) {
        try {
            return Files.readAllBytes(resolve(key));
        } catch (IOException e) {
            throw new ExamException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILURE",
                    "Falha ao ler o arquivo armazenado.", true);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // melhor esforco: o arquivo orfao nao afeta a consistencia dos dados
        }
    }

    /** Resolve a chave garantindo que o caminho final permanece dentro da raiz (anti path traversal). */
    Path resolve(String key) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_STORAGE_KEY", "Chave de arquivo invalida.");
        }
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_STORAGE_KEY", "Chave de arquivo invalida.");
        }
        return p;
    }
}
