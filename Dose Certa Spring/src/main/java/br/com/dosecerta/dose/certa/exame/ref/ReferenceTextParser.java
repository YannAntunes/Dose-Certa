package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Interpreta o texto de referencia impresso pelo laboratorio. E conservador: textos com multiplos criterios
 * (desejavel/limitrofe/risco/faixas etarias nao estruturadas etc.) sao marcados como ambiguos e NAO estruturados.
 * Ponto seguido de exatamente 3 digitos (ex.: 4.000) e tratado como separador de milhar.
 */
public final class ReferenceTextParser {

    public record Parsed(List<ReferenceBand> bands, boolean ambiguous, String reason) {
        public static Parsed none() { return new Parsed(List.of(), false, null); }
        static Parsed ambiguous(String reason) { return new Parsed(List.of(), true, reason); }
    }

    private static final String NUM = "(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)";

    private static final Pattern MULTI_CRITERIA = Pattern.compile(
            "desej|otim|limitrof|borderline|risco|\\bmeta\\b|diabet|gestante|crianc|recem|adult|idos|\\bpos\\b|apos|\\balto\\b|\\bbaixo\\b|\\bnormal\\b.*\\bnormal\\b");
    private static final Pattern PREFIX = Pattern.compile(
            "^\\s*(valores?\\s+de\\s+referencia|valor\\s+de\\s+referencia|referencia|ref\\.?|v\\.?\\s?r\\.?)\\s*[:.\\-]?\\s*");
    private static final Pattern RANGE = Pattern.compile(
            "^(?:de\\s+)?" + NUM + "\\s*(?:-|a|ate|to)\\s*" + NUM + "(?:\\s*[^\\d\\s<>=].*)?$");
    private static final Pattern UPPER = Pattern.compile(
            "^(<=|<|ate|inferior a|menor que|menor ou igual a|menor ou igual)\\s*" + NUM + "(?:\\s*[^\\d\\s<>=].*)?$");
    private static final Pattern LOWER = Pattern.compile(
            "^(>=|>|superior a|maior que|acima de|maior ou igual a|maior ou igual)\\s*" + NUM + "(?:\\s*[^\\d\\s<>=].*)?$");
    private static final Pattern SEX_MARK = Pattern.compile("\\b(homens?|masculino|mulheres?|feminino)\\b\\s*[:\\-]?");
    private static final Pattern AGE_MARK = Pattern.compile("\\b(\\d{1,3})\\s*(?:a|-)\\s*(\\d{1,3})\\s*anos?\\s*[:\\-]?");

    private ReferenceTextParser() {}

    public static Parsed parse(String raw) {
        if (raw == null || raw.isBlank()) return Parsed.none();
        String t = simplify(raw);
        t = PREFIX.matcher(t).replaceFirst("").trim();
        if (t.isEmpty()) return Parsed.none();

        // marcadores de sexo e faixa etaria ("anos" so e aceito no formato "N a M anos")
        List<int[]> marks = new ArrayList<>(); // {start, end, sexOrdinal(-1 none), ageMin(-1), ageMax(-1)}
        Matcher sm = SEX_MARK.matcher(t);
        while (sm.find()) {
            Sex s = sm.group(1).startsWith("h") || sm.group(1).startsWith("masc") ? Sex.M : Sex.F;
            marks.add(new int[]{sm.start(), sm.end(), s.ordinal(), -1, -1});
        }
        Matcher am = AGE_MARK.matcher(t);
        while (am.find()) {
            marks.add(new int[]{am.start(), am.end(), -1, Integer.parseInt(am.group(1)), Integer.parseInt(am.group(2))});
        }
        String stripped = t;
        for (int[] m : marks) stripped = stripped.replace(t.substring(m[0], m[1]), " ");
        if (MULTI_CRITERIA.matcher(stripped).find() || stripped.matches(".*\\banos?\\b.*|.*\\bmeses\\b.*")) {
            return Parsed.ambiguous("Referencia com multiplos criterios ou contexto nao estruturado");
        }

        if (marks.isEmpty()) {
            Optional<ReferenceBand> b = parseRule(t, null, null, null);
            return b.map(x -> new Parsed(List.of(x), false, null))
                    .orElseGet(() -> Parsed.ambiguous("Formato de referencia nao reconhecido"));
        }

        marks.sort((a, b) -> Integer.compare(a[0], b[0]));
        if (!t.substring(0, marks.get(0)[0]).isBlank()) {
            return Parsed.ambiguous("Texto de referencia antes dos marcadores de sexo/idade");
        }
        List<ReferenceBand> bands = new ArrayList<>();
        Sex pendSex = null;
        Integer pendMin = null, pendMax = null;
        for (int i = 0; i < marks.size(); i++) {
            int[] m = marks.get(i);
            if (m[2] >= 0) pendSex = Sex.values()[m[2]];
            if (m[3] >= 0) { pendMin = m[3]; pendMax = m[4]; }
            int end = i + 1 < marks.size() ? marks.get(i + 1)[0] : t.length();
            String seg = t.substring(m[1], end).trim();
            if (seg.isEmpty()) continue; // marcador combinado com o proximo
            Optional<ReferenceBand> b = parseRule(seg, pendSex, pendMin, pendMax);
            if (b.isEmpty()) return Parsed.ambiguous("Segmento de referencia nao reconhecido");
            bands.add(b.get());
            pendSex = null; pendMin = null; pendMax = null;
        }
        if (bands.isEmpty() || pendSex != null || pendMin != null) {
            return Parsed.ambiguous("Marcadores de sexo/idade sem faixa associada");
        }
        return new Parsed(bands, false, null);
    }

    private static Optional<ReferenceBand> parseRule(String s, Sex sex, Integer ageMin, Integer ageMax) {
        String x = s.trim().replaceAll("[;.]+$", "").trim();
        Matcher m = RANGE.matcher(x);
        if (m.matches()) {
            BigDecimal lo = number(m.group(1)), hi = number(m.group(2));
            if (lo.compareTo(hi) > 0) return Optional.empty();
            return Optional.of(ReferenceBand.ofLab(sex, ageMin, ageMax, lo, BoundOperator.GE, hi, BoundOperator.LE));
        }
        m = UPPER.matcher(x);
        if (m.matches()) {
            String op = m.group(1);
            BoundOperator bo = (op.equals("<") || op.equals("inferior a") || op.equals("menor que"))
                    ? BoundOperator.LT : BoundOperator.LE;
            return Optional.of(ReferenceBand.ofLab(sex, ageMin, ageMax, null, null, number(m.group(2)), bo));
        }
        m = LOWER.matcher(x);
        if (m.matches()) {
            String op = m.group(1);
            BoundOperator bo = (op.equals(">") || op.equals("superior a") || op.equals("maior que") || op.equals("acima de"))
                    ? BoundOperator.GT : BoundOperator.GE;
            return Optional.of(ReferenceBand.ofLab(sex, ageMin, ageMax, number(m.group(2)), bo, null, null));
        }
        return Optional.empty();
    }

    public static BigDecimal number(String tok) {
        String n = tok.trim();
        if (n.matches("[1-9]\\d{0,2}(\\.\\d{3})+(,\\d+)?")) n = n.replace(".", "");
        return new BigDecimal(n.replace(',', '.'));
    }

    private static String simplify(String raw) {
        String n = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        n = n.toLowerCase(Locale.ROOT).replace('\u2013', '-').replace('\u2014', '-')
                .replace("\u2264", "<=").replace("\u2265", ">=");
        return n.replaceAll("\\s+", " ").trim();
    }
}
