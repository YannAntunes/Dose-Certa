package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ContextReasonCategory;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.model.ReferenceRange;
import br.com.dosecerta.dose.certa.exame.repo.ReferenceRangeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Motor deterministico de comparacao com referencias. Prioridade: referencia impressa pelo laboratorio;
 * referencias cadastradas so entram quando o resultado nao traz referencia. Nunca escolhe entre candidatas
 * ambiguas, nunca trata ausencia de referencia como normalidade e so marca CRITICAL com limite critico documentado.
 */
@Service
public class ReferenceRangeService {

    public record EvalInput(String testCode, BigDecimal numericValue, String textValue, String normalizedUnit,
                            String referenceText, Integer ageYears, Sex sex, LocalDate date) {}

    public record Evaluation(ResultStatus status, String justification, ReferenceBand band, String appliedReference, String contextReasonCode) {
        public static Evaluation of(ResultStatus s, String why) { return new Evaluation(s, why, null, null, null); }
        public static Evaluation of(ResultStatus s, String why, ReferenceBand b, String applied) { return new Evaluation(s, why, b, applied, null); }
        public static Evaluation ofContext(String code, String why) { return new Evaluation(ResultStatus.REQUIRES_CONTEXT, why, null, null, code); }
    }

    private final ReferenceRangeRepository repository;

    public ReferenceRangeService(ReferenceRangeRepository repository) {
        this.repository = repository;
    }

    public Evaluation evaluate(EvalInput in) {
        List<ReferenceRange> db = in.testCode() == null || in.numericValue() == null
                ? List.of() : repository.findByTestCode(in.testCode());
        return evaluate(in, db);
    }

    /** Variante pura (sem acesso a banco) para testes. */
    public Evaluation evaluate(EvalInput in, List<ReferenceRange> dbCandidates) {
        if (in.numericValue() == null) return evaluateQualitative(in);

        boolean hasLabText = in.referenceText() != null && !in.referenceText().isBlank();
        if (hasLabText) {
            ReferenceTextParser.Parsed parsed = ReferenceTextParser.parse(in.referenceText());
            if (parsed.ambiguous() || parsed.bands().isEmpty()) {
                return Evaluation.ofContext(
                        ContextReasonCategory.METHOD_COMPARABILITY_UNKNOWN.name(),
                        "Referência do laboratório não pôde ser estruturada com segurança: "
                                + (parsed.reason() == null ? "formato desconhecido" : parsed.reason()) + ". Requer avaliação médica contextual.");
            }
            Selection sel = select(parsed.bands(), in.sex(), in.ageYears());
            if (sel.band == null) return new Evaluation(sel.status, sel.reason, null, null, sel.contextCode);
            Evaluation e = compare(in.numericValue(), sel.band, "LABORATORY", "referencia do laboratorio");
            // limite critico documentado pode refinar BELOW/ABOVE
            if (e.status() != ResultStatus.WITHIN_REFERENCE) {
                Evaluation crit = criticalFromDb(in, dbCandidates);
                if (crit != null) return crit;
            }
            return e;
        }

        if (dbCandidates.isEmpty()) {
            return Evaluation.of(ResultStatus.NO_REFERENCE, "Nenhuma referencia disponivel para este resultado.");
        }
        // referencias cadastradas
        List<ReferenceBand> eligible = new ArrayList<>();
        boolean unitMismatch = false, unitUnknown = false;
        for (ReferenceRange r : dbCandidates) {
            if (!validOn(r, in.date())) continue;
            if (in.normalizedUnit() == null) { unitUnknown = true; continue; }
            if (!in.normalizedUnit().equals(r.getUnit())) { unitMismatch = true; continue; }
            eligible.add(toBand(r));
        }
        if (eligible.isEmpty()) {
            if (unitUnknown) return Evaluation.ofContext(
                    ContextReasonCategory.UNIT_AMBIGUITY.name(),
                    "Unidade do resultado desconhecida; impossivel verificar compatibilidade com a referencia cadastrada.");
            if (unitMismatch) return Evaluation.ofContext(
                    ContextReasonCategory.UNIT_AMBIGUITY.name(),
                    "Unidade do resultado incompativel com as referencias cadastradas (sem conversao definida).");
            return Evaluation.of(ResultStatus.NO_REFERENCE, "Nenhuma referencia cadastrada vigente para este resultado.");
        }
        Selection sel = select(eligible, in.sex(), in.ageYears());
        if (sel.band == null) return new Evaluation(sel.status, sel.reason, null, null, sel.contextCode);
        ReferenceBand b = sel.band;
        Evaluation e = compare(in.numericValue(), b, "REFERENCE_RANGE:" + b.dbId(), "referencia cadastrada #" + b.dbId());
        if (b.criticalLow() != null && in.numericValue().compareTo(b.criticalLow()) < 0
                || b.criticalHigh() != null && in.numericValue().compareTo(b.criticalHigh()) > 0) {
            return new Evaluation(ResultStatus.CRITICAL,
                    "Valor alem do limite critico documentado na referencia cadastrada #" + b.dbId() + ".", b, e.appliedReference(), null);
        }
        return e;
    }

    private Evaluation criticalFromDb(EvalInput in, List<ReferenceRange> db) {
        if (in.normalizedUnit() == null) return null;
        List<ReferenceBand> eligible = new ArrayList<>();
        for (ReferenceRange r : db) {
            if (validOn(r, in.date()) && in.normalizedUnit().equals(r.getUnit())
                    && (r.getCriticalLow() != null || r.getCriticalHigh() != null)) eligible.add(toBand(r));
        }
        Selection sel = select(eligible, in.sex(), in.ageYears());
        if (sel.band == null) return null;
        ReferenceBand b = sel.band;
        if (b.criticalLow() != null && in.numericValue().compareTo(b.criticalLow()) < 0
                || b.criticalHigh() != null && in.numericValue().compareTo(b.criticalHigh()) > 0) {
            return new Evaluation(ResultStatus.CRITICAL,
                    "Valor alem do limite critico documentado na referencia cadastrada #" + b.dbId() + ".", b,
                    "REFERENCE_RANGE:" + b.dbId(), null);
        }
        return null;
    }

    // ---------- selecao ----------

    private record Selection(ReferenceBand band, ResultStatus status, String reason, String contextCode) {}

    private static Selection select(List<ReferenceBand> bands, Sex sex, Integer age) {
        List<ReferenceBand> applicable = new ArrayList<>();
        int undetermined = 0;
        for (ReferenceBand b : bands) {
            boolean unknown = false, excluded = false;
            if (b.sex() != null) {
                if (sex == null) unknown = true; else if (sex != b.sex()) excluded = true;
            }
            if (b.ageMin() != null || b.ageMax() != null) {
                if (age == null) unknown = true;
                else if ((b.ageMin() != null && age < b.ageMin()) || (b.ageMax() != null && age > b.ageMax())) excluded = true;
            }
            if (excluded) continue;
            if (unknown) undetermined++; else applicable.add(b);
        }
        if (applicable.size() == 1 && undetermined == 0) return new Selection(applicable.get(0), null, null, null);
        if (applicable.size() + undetermined == 0) {
            return new Selection(null, ResultStatus.NO_REFERENCE, "Nenhuma faixa de referencia cobre o paciente (sexo/idade).", null);
        }
        if (undetermined > 0) {
            return new Selection(null, ResultStatus.REQUIRES_CONTEXT,
                    "O intervalo de referencia aplicavel depende de sexo biologico ou faixa etaria nao informados no cadastro do paciente.",
                    ContextReasonCategory.MISSING_PATIENT_INFORMATION.name());
        }
        return new Selection(null, ResultStatus.REQUIRES_CONTEXT,
                "Multiplas faixas de referencia candidatas foram encontradas. A selecao inequivoca exige estratificacao clinica do paciente.",
                ContextReasonCategory.CONFLICTING_REFERENCE_RANGES.name());
    }

    // ---------- comparacao ----------

    private static Evaluation compare(BigDecimal v, ReferenceBand b, String applied, String label) {
        boolean below = b.lower() != null
                && (b.lowerOp() == BoundOperator.GT ? v.compareTo(b.lower()) <= 0 : v.compareTo(b.lower()) < 0);
        boolean above = b.upper() != null
                && (b.upperOp() == BoundOperator.LT ? v.compareTo(b.upper()) >= 0 : v.compareTo(b.upper()) > 0);
        ResultStatus s = below ? ResultStatus.BELOW_REFERENCE : above ? ResultStatus.ABOVE_REFERENCE : ResultStatus.WITHIN_REFERENCE;
        String why = switch (s) {
            case BELOW_REFERENCE -> "Valor abaixo do limite inferior da " + label + ".";
            case ABOVE_REFERENCE -> "Valor acima do limite superior da " + label + ".";
            default -> "Valor dentro da " + label + ".";
        };
        return new Evaluation(s, why, b, applied, null);
    }

    private static boolean validOn(ReferenceRange r, LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        return (r.getValidFrom() == null || !d.isBefore(r.getValidFrom()))
                && (r.getValidTo() == null || !d.isAfter(r.getValidTo()));
    }

    private static ReferenceBand toBand(ReferenceRange r) {
        return new ReferenceBand(r.getSex(), r.getAgeMinYears(), r.getAgeMaxYears(),
                r.getLowerBound(), r.getLowerBound() == null ? null : orDefault(r.getLowerOp(), BoundOperator.GE),
                r.getUpperBound(), r.getUpperBound() == null ? null : orDefault(r.getUpperOp(), BoundOperator.LE),
                r.getId(), r.getUnit(), r.getCriticalLow(), r.getCriticalHigh());
    }

    private static BoundOperator orDefault(BoundOperator o, BoundOperator d) { return o != null ? o : d; }

    // ---------- qualitativos ----------

    private static Evaluation evaluateQualitative(EvalInput in) {
        String ref = in.referenceText();
        if (ref == null || ref.isBlank()) {
            return Evaluation.of(ResultStatus.NO_REFERENCE, "Resultado qualitativo sem referencia.");
        }
        Boolean expectNegative = polarity(ref);
        Boolean valueNegative = polarity(in.textValue());
        if (expectNegative == null || valueNegative == null) {
            return Evaluation.ofContext(ContextReasonCategory.METHOD_COMPARABILITY_UNKNOWN.name(),
                    "Resultado ou referencia qualitativa com texto nao reconhecido automaticamente.");
        }
        return expectNegative.equals(valueNegative)
                ? Evaluation.of(ResultStatus.WITHIN_REFERENCE, "Resultado qualitativo coincide com a referencia do laboratorio.")
                : Evaluation.ofContext(ContextReasonCategory.RESULT_REQUIRES_CLINICAL_CORRELATION.name(),
                "Resultado qualitativo diverge da referencia padrao do laboratorio; interpretacao exige correlacao com o quadro clinico.");
    }

    /** true = negativo/ausente; false = positivo/presente; null = desconhecido. */
    static Boolean polarity(String text) {
        if (text == null) return null;
        String t = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        if (t.contains("negativ") || t.contains("nao reagente") || t.contains("ausente") || t.contains("nao detectad")) return true;
        if (t.contains("positiv") || t.contains("reagente") || t.contains("presente") || t.contains("detectado")) return false;
        return null;
    }
}
