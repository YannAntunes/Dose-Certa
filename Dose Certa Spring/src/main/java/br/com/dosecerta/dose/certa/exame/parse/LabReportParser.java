package br.com.dosecerta.dose.certa.exame.parse;

import br.com.dosecerta.dose.certa.exame.extract.ExtractedDocument;
import br.com.dosecerta.dose.certa.exame.norm.TestNormalizer;
import br.com.dosecerta.dose.certa.exame.ref.ReferenceTextParser;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parser generico de laudos laboratoriais em texto. Estrategias: linha unica (nome valor unidade referencia),
 * linhas quebradas (nome numa linha, valores na seguinte), continuacao de referencia (sexo/"Referencia:") e quadro
 * comparativo historico. Nao inventa valores: ambiguidades sao registradas e marcam revisao manual.
 */
@Component
public class LabReportParser {

    public record ParsedResult(String name, String valueText, BigDecimal numericValue, String unit,
                               String referenceText, int page, String snippet, double confidence,
                               boolean needsReview, boolean qualitative, boolean historical,
                               LocalDate date, List<String> notes) {}

    public record ParsedReport(String laboratory, LocalDate collectionDate, LocalDate releaseDate,
                               List<ParsedResult> results, List<String> warnings) {}

    private static final String QUAL = "n[\u00e3a]o\\s+reagente|n[\u00e3a]o\\s+detectado|reagente|negativo|positivo|ausente|presente|detectado";
    private static final String NUMTOK = "(?:[<>]=?\\s?)?(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)";
    private static final Pattern LINE = Pattern.compile(
            "^(?<name>\\p{L}[\\p{L}\\p{N} ()/.,%+\\-']{1,70}?)\\s*[:.]*\\s+(?<val>" + NUMTOK + "|(?i:" + QUAL + "))(?:\\s+(?<rest>.*))?$");
    private static final Pattern QUAL_VALUE = Pattern.compile("(?i)^(" + QUAL + ")$");
    private static final Pattern CONTINUATION = Pattern.compile(
            "(?i)^(homens?|mulheres?|masculino|feminino|refer[\u00eae]ncia|valores?\\s+de\\s+refer[\u00eae]ncia|v\\.?\\s?r\\.?)\\b.*");
    private static final Pattern DATE = Pattern.compile("\\b(\\d{2}/\\d{2}/\\d{4})\\b");
    private static final Pattern HIST_ROW = Pattern.compile(
            "^(?<name>\\p{L}[\\p{L}\\p{N} ()/.,%+\\-']{1,70}?)\\s+(?<vals>(?:(?:\\d+(?:[.,]\\d+)?|-{1,2})(?:\\s+|$))+)$");
    private static final Pattern LAB = Pattern.compile("(?i)laborat[\u00f3o]rio\\s*[:\\-]\\s*(.{3,80})");
    private static final Pattern COLLECT = Pattern.compile(
            "(?i)(?:coleta|colhido\\s+em|coletado\\s+em)\\s*[:\\-]?\\s*(?:em\\s*)?(\\d{2}/\\d{2}/\\d{4})");
    private static final Pattern RELEASE = Pattern.compile(
            "(?i)(?:libera[\u00e7c][\u00e3a]o|liberado\\s+em|emiss[\u00e3a]o)\\s*[:\\-]?\\s*(?:em\\s*)?(\\d{2}/\\d{2}/\\d{4})");
    private static final Pattern REF_PREFIX = Pattern.compile(
            "(?i)^(valores?\\s+de\\s+refer[\u00eae]ncia|refer[\u00eae]ncia|ref\\.?|v\\.?\\s?r\\.?)\\s*[:.\\-]?\\s*");
    private static final Pattern NUMERIC_SEQUENCE = Pattern.compile("^\\d+(?:[.,]\\d+)?(?:\\s+\\d+(?:[.,]\\d+)?)*$");
    private static final Pattern NOT_HISTORY_HEADER = Pattern.compile(
            "(?i).*(coleta|libera|emiss|nasc|impress|valid|cadastro|atendimento|validade).*");
    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu");
    private static final Set<String> NOT_RESULT_NAMES = Set.of(
            "pagina", "paciente", "idade", "data", "telefone", "crm", "cpf", "cep", "protocolo", "pedido",
            "atendimento", "amostra", "rg", "nascimento", "convenio", "medico", "solicitante", "material",
            "metodo", "resultado", "resultados", "exame", "exames", "fone", "registro", "lote", "sala", "tel");

    private final TestNormalizer normalizer;

    public LabReportParser(TestNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    private static final class Row {
        String name, valueText, unit, ref, snippet;
        BigDecimal numeric;
        int page;
        double confidence;
        boolean review, qualitative, historical;
        LocalDate date;
        List<String> notes = new ArrayList<>();
    }

    public ParsedReport parse(ExtractedDocument doc) {
        String lab = null;
        LocalDate collection = null, release = null;
        for (String page : doc.pages()) {
            for (String raw : page.split("\\R")) {
                String line = clean(raw);
                if (lab == null) { Matcher m = LAB.matcher(line); if (m.find()) lab = m.group(1).trim(); }
                if (collection == null) { Matcher m = COLLECT.matcher(line); if (m.find()) collection = date(m.group(1)); }
                if (release == null) { Matcher m = RELEASE.matcher(line); if (m.find()) release = date(m.group(1)); }
            }
        }

        List<Row> rows = new ArrayList<>();
        int unparsedNumericLines = 0;
        for (int p = 0; p < doc.pages().size(); p++) {
            String pending = null;
            Row last = null;
            List<LocalDate> histDates = null;
            for (String raw : doc.pages().get(p).split("\\R")) {
                String line = clean(raw);
                if (line.isEmpty()) continue;
                int page = p + 1;

                if (histDates != null) {
                    List<Row> hist = historyRow(line, histDates, page, collection);
                    if (hist != null) { rows.addAll(hist); continue; }
                    histDates = null;
                }
                List<LocalDate> dates = dates(line);
                if (dates.size() >= 2 && isHistoryHeader(line)) {
                    histDates = dates; pending = null; last = null;
                    continue;
                }
                if (last != null && CONTINUATION.matcher(line).matches()) {
                    String extra = REF_PREFIX.matcher(line).replaceFirst("");
                    last.ref = last.ref == null || last.ref.isBlank() ? extra : last.ref + " " + extra;
                    continue;
                }
                Row r = fromLine(line, page, false);
                if (r == null && pending != null && startsWithValue(line)) {
                    r = fromLine(pending + " " + line, page, true);
                }
                if (r != null) {
                    rows.add(r);
                    last = r;
                    pending = null;
                    continue;
                }
                pending = nameOnly(line) ? line : null;
                if (line.matches(".*\\d.*") && dates.isEmpty()) unparsedNumericLines++;
            }
        }

        List<ParsedResult> results = new ArrayList<>();
        for (Row r : rows) {
            String ref = r.ref == null || r.ref.isBlank() ? null : r.ref.trim();
            results.add(new ParsedResult(r.name, r.valueText, r.numeric, r.unit, ref, r.page, r.snippet,
                    Math.max(0, Math.min(1, r.confidence)), r.review, r.qualitative, r.historical, r.date,
                    List.copyOf(r.notes)));
        }
        List<String> warnings = new ArrayList<>();
        if (unparsedNumericLines > 0) {
            warnings.add(unparsedNumericLines + " linha(s) com numeros nao foram interpretadas como resultado.");
        }
        return new ParsedReport(lab, collection, release, results, warnings);
    }

    // ---------- linha unica ----------

    private Row fromLine(String line, int page, boolean wrapped) {
        Matcher m = LINE.matcher(line);
        if (!m.matches()) return null;
        String name = m.group("name").replaceAll("[\\s:.\\-]+$", "").trim();
        if (name.isEmpty() || NOT_RESULT_NAMES.contains(firstWordKey(name))) return null;
        String val = m.group("val").trim();
        String rest = m.group("rest") == null ? "" : m.group("rest").trim();

        Row r = new Row();
        r.name = name;
        r.page = page;
        r.snippet = line.length() > 300 ? line.substring(0, 300) : line;
        r.valueText = val;
        boolean identified = normalizer.identifyTest(name).isPresent();

        if (QUAL_VALUE.matcher(val).matches()) {
            r.qualitative = true;
            r.ref = stripRefPrefix(rest);
            r.confidence = identified ? 0.85 : 0.6;
            if (!identified) { r.review = true; r.notes.add("Exame qualitativo nao catalogado."); }
            if (wrapped) { r.confidence -= 0.15; r.notes.add("Resultado reconstruido de linhas quebradas."); }
            return r;
        }

        // numerico (possivelmente censurado "<0,5")
        boolean censored = val.startsWith("<") || val.startsWith(">");
        String numPart = val.replaceAll("^[<>]=?\\s?", "");
        BigDecimal number = ReferenceTextParser.number(numPart);

        String unit = null;
        String ref = rest;
        if (!rest.isEmpty()) {
            String[] parts = rest.split("\\s+", 2);
            if (plausibleUnit(parts[0])) {
                unit = parts[0];
                ref = parts.length > 1 ? parts[1] : "";
            }
        }
        if (!identified && unit == null) return null; // sem catalogo e sem unidade: provavel ruido de cabecalho
        ref = stripRefPrefix(ref);

        r.unit = unit;
        r.ref = ref;
        r.confidence = 0.6 + (unit != null ? 0.2 : 0) + (ref != null && !ref.isBlank() ? 0.2 : 0);
        if (censored) {
            r.numeric = null;
            r.review = true;
            r.confidence = Math.min(r.confidence, 0.4);
            r.notes.add("Valor censurado (" + val + "); nao interpretado como numero.");
        } else {
            r.numeric = number;
        }
        if (ref != null && NUMERIC_SEQUENCE.matcher(ref).matches()) {
            r.review = true;
            r.confidence = Math.min(r.confidence, 0.3);
            r.notes.add("Sequencia numerica ambigua apos o valor (pode ser referencia ou resultado anterior).");
        }
        if (wrapped) { r.confidence -= 0.15; r.notes.add("Resultado reconstruido de linhas quebradas."); }
        return r;
    }

    private boolean plausibleUnit(String tok) {
        if (tok.isEmpty() || !tok.matches("^[^\\d<>=+\\-].*")) return false;
        if (REF_PREFIX.matcher(tok).lookingAt() && tok.length() < 12 && !normalizer.canonicalUnit(tok).isPresent()) return false;
        return normalizer.canonicalUnit(tok).isPresent() || tok.contains("/") || tok.contains("%");
    }

    private static String stripRefPrefix(String s) {
        if (s == null) return null;
        String t = REF_PREFIX.matcher(s.trim()).replaceFirst("").trim();
        return t.isEmpty() ? null : t;
    }

    // ---------- historico ----------

    private boolean isHistoryHeader(String line) {
        String rest = DATE.matcher(line).replaceAll(" ").replaceAll("[|;,/\\-]", " ").trim();
        return rest.length() <= 30 && !NOT_HISTORY_HEADER.matcher(line).matches();
    }

    private List<Row> historyRow(String line, List<LocalDate> dates, int page, LocalDate currentCollection) {
        Matcher m = HIST_ROW.matcher(line);
        if (!m.matches()) return null;
        String name = m.group("name").trim();
        if (normalizer.identifyTest(name).isEmpty()) return null;
        String[] cells = m.group("vals").trim().split("\\s+");
        if (cells.length != dates.size()) return null;
        List<Row> out = new ArrayList<>();
        for (int i = 0; i < cells.length; i++) {
            if (cells[i].startsWith("-")) continue;
            LocalDate d = dates.get(i);
            if (d == null || d.equals(currentCollection)) continue; // evita duplicar o resultado atual
            Row r = new Row();
            r.name = name;
            r.page = page;
            r.snippet = line.length() > 300 ? line.substring(0, 300) : line;
            r.valueText = cells[i];
            r.numeric = ReferenceTextParser.number(cells[i]);
            r.historical = true;
            r.date = d;
            r.review = true;
            r.confidence = 0.6;
            r.notes.add("Resultado anterior de quadro comparativo; unidade nao informada no quadro.");
            out.add(r);
        }
        return out;
    }

    // ---------- utilitarios ----------

    private static boolean startsWithValue(String line) {
        return line.matches("^(?:[<>]=?\\s?)?\\d.*") || line.matches("(?i)^(" + QUAL + ")\\b.*");
    }

    private static boolean nameOnly(String line) {
        return line.length() >= 3 && line.length() <= 70 && line.matches("^\\p{L}[\\p{L} ()/.,%+\\-']*$")
                && !NOT_RESULT_NAMES.contains(firstWordKey(line)) && !CONTINUATION.matcher(line).matches();
    }

    private static List<LocalDate> dates(String line) {
        List<LocalDate> out = new ArrayList<>();
        Matcher m = DATE.matcher(line);
        while (m.find()) out.add(date(m.group(1)));
        return out;
    }

    private static LocalDate date(String s) {
        try {
            return LocalDate.parse(s, BR_DATE);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String firstWordKey(String name) {
        String k = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        return k.split("[^a-z0-9]+")[0];
    }

    private static String clean(String raw) {
        return raw.replace('\u00a0', ' ').replace('\t', ' ').replaceAll(" {2,}", " ").trim();
    }
}
