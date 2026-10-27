package br.com.dosecerta.dose.certa.exame.service;

import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.config.ExamModuleProperties;
import br.com.dosecerta.dose.certa.exame.model.Exam;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.repo.ExamRepository;
import br.com.dosecerta.dose.certa.exame.storage.ExamStorage;
import br.com.dosecerta.dose.certa.exame.web.ExamDtos.ExamSummary;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/** Validacao, armazenamento seguro e registro do upload; em seguida aciona o processamento. */
@Service
public class ExamUploadService {

    private static final Logger log = LoggerFactory.getLogger(ExamUploadService.class);

    private final PacienteRepository pacientes;
    private final ExamRepository exams;
    private final ExamStorage storage;
    private final ExamProcessingService processing;
    private final ExamQueryService queries;
    private final long maxBytes;

    public ExamUploadService(PacienteRepository pacientes, ExamRepository exams, ExamStorage storage,
                             ExamProcessingService processing, ExamQueryService queries,
                             ExamModuleProperties props) {
        this.pacientes = pacientes;
        this.exams = exams;
        this.storage = storage;
        this.processing = processing;
        this.queries = queries;
        this.maxBytes = props.upload().maxBytes();
    }

    public ExamSummary upload(Long patientId, MultipartFile file, String sexParam, String login) {
        Paciente patient = pacientes.findById(patientId).orElseThrow(() ->
                new ExamException(HttpStatus.NOT_FOUND, "PATIENT_NOT_FOUND", "Paciente nao encontrado."));
        if (file == null || file.isEmpty()) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Arquivo ausente ou vazio.");
        }
        if (file.getSize() > maxBytes) {
            throw new ExamException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                    "O arquivo excede o tamanho maximo permitido.");
        }
        String filename = sanitizeFilename(file.getOriginalFilename());
        if (!filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Somente arquivos PDF sao aceitos.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Nao foi possivel ler o arquivo enviado.");
        }
        if (content.length > maxBytes) {
            throw new ExamException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                    "O arquivo excede o tamanho maximo permitido.");
        }
        if (!looksLikePdf(content)) {
            throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_FILE",
                    "O conteudo do arquivo nao corresponde a um PDF.");
        }
        Sex sex = parseSex(sexParam);
        String hash = sha256(content);
        exams.findByPacienteIdAndFileSha256(patientId, hash).ifPresent(existing -> {
            throw new ExamException(HttpStatus.CONFLICT, "DUPLICATE_EXAM",
                    "Este arquivo ja foi enviado para o paciente (exame " + existing.getId() + ").");
        });

        String key = storage.store(content);
        Exam exam = new Exam();
        exam.setPaciente(patient);
        exam.setOriginalFilename(filename);
        exam.setStorageKey(key);
        exam.setFileSha256(hash);
        exam.setSex(sex);
        exam.setUploadedBy(login == null ? "desconhecido" : login);
        try {
            exam = exams.saveAndFlush(exam);
        } catch (DataIntegrityViolationException e) {
            storage.delete(key);
            throw new ExamException(HttpStatus.CONFLICT, "DUPLICATE_EXAM",
                    "Este arquivo ja foi enviado para o paciente.");
        }
        log.info("Exame id={} enviado para paciente id={} por usuario={}", exam.getId(), patientId, login);
        processing.process(exam.getId());
        return queries.summary(exam.getId());
    }

    private static Sex parseSex(String s) {
        if (s == null || s.isBlank()) return null;
        return switch (s.trim().toUpperCase(Locale.ROOT)) {
            case "M" -> Sex.M;
            case "F" -> Sex.F;
            default -> throw new ExamException(HttpStatus.BAD_REQUEST, "INVALID_SEX",
                    "O parametro 'sex' deve ser M ou F.");
        };
    }

    /** O PDF deve conter a assinatura "%PDF-" nos primeiros 1024 bytes. */
    static boolean looksLikePdf(byte[] c) {
        int limit = Math.min(c.length, 1024);
        String head = new String(c, 0, limit, StandardCharsets.ISO_8859_1);
        return head.contains("%PDF-");
    }

    static String sanitizeFilename(String original) {
        String n = original == null ? "" : original;
        n = n.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (n.length() > 200) n = n.substring(n.length() - 200);
        return n;
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
