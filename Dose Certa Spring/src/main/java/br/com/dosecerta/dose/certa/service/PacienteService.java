package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.RegraClinicaException;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PacienteService {

    private final PacienteRepository repository;

    public PacienteService(PacienteRepository repository) {
        this.repository = repository;
    }

    /** Normaliza o documento baseado no tipo */
    public static String formatarDocumento(String documento, String tipo) {
        if (documento == null) return null;
        if ("PASSAPORTE".equalsIgnoreCase(tipo)) return documento.trim();
        
        String digitos = documento.replaceAll("[^0-9]", "");
        if (digitos.length() != 11) return documento; // retorna original se inválido

        if (todosDigitosIguais(digitos) || !isCpfValido(digitos)) {
            throw new IllegalArgumentException("CPF inválido");
        }

        return digitos.substring(0, 3) + "." +
               digitos.substring(3, 6) + "." +
               digitos.substring(6, 9) + "-" +
               digitos.substring(9, 11);
    }

    private static boolean todosDigitosIguais(String cpf) {
        return cpf.chars().distinct().count() == 1;
    }

    private static boolean isCpfValido(String cpf) {
        try {
            int d1 = 0, d2 = 0;
            int digito1, digito2, resto;
            int digitoCPF;
            String nDigResult;

            for (int nCount = 1; nCount < cpf.length() - 1; nCount++) {
                digitoCPF = Integer.parseInt(cpf.substring(nCount - 1, nCount));
                d1 = d1 + (11 - nCount) * digitoCPF;
                d2 = d2 + (12 - nCount) * digitoCPF;
            }

            resto = (d1 % 11);
            if (resto < 2) digito1 = 0;
            else digito1 = 11 - resto;

            d2 += 2 * digito1;
            resto = (d2 % 11);
            if (resto < 2) digito2 = 0;
            else digito2 = 11 - resto;

            String nDigVerific = cpf.substring(cpf.length() - 2);
            nDigResult = String.valueOf(digito1) + String.valueOf(digito2);
            return nDigVerific.equals(nDigResult);
        } catch (Exception e) {
            return false;
        }
    }

    public Paciente salvar(Paciente paciente) {
        if (paciente.getNome() == null || paciente.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (paciente.getCpf() == null || paciente.getCpf().isBlank())
            throw new IllegalArgumentException("CPF inválido");

        if (paciente.getPeso() <= 0 || paciente.getPeso() > 500)
            throw new IllegalArgumentException("Peso inválido");

        if (paciente.getIdade() < 0 || paciente.getIdade() > 120)
            throw new IllegalArgumentException("Idade inválida");

        // Normaliza CPF/Documento antes de verificar unicidade
        String docFormatado = formatarDocumento(paciente.getCpf(), paciente.getTipoDocumento());
        paciente.setCpf(docFormatado);

        if (repository.existsByCpf(docFormatado)) {
            throw new RegraClinicaException("Documento já cadastrado");
        }

        return repository.save(paciente);
    }

    public Paciente atualizar(Long id, Paciente dados) {
        Paciente existente = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Paciente não encontrado"));

        if (dados.getNome() == null || dados.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (dados.getPeso() <= 0 || dados.getPeso() > 500)
            throw new IllegalArgumentException("Peso inválido");

        if (dados.getIdade() < 0 || dados.getIdade() > 120)
            throw new IllegalArgumentException("Idade inválida");

        // Se CPF/Documento mudou, verifica unicidade
        String docFormatado = formatarDocumento(dados.getCpf(), dados.getTipoDocumento());
        if (docFormatado != null && !docFormatado.equals(existente.getCpf())) {
            if (repository.existsByCpf(docFormatado)) {
                throw new RegraClinicaException("Documento já cadastrado para outro paciente");
            }
        }

        existente.setNome(dados.getNome());
        existente.setCpf(docFormatado);
        existente.setPeso(dados.getPeso());
        existente.setIdade(dados.getIdade());
        existente.setTipoDocumento(dados.getTipoDocumento());
        existente.setPaisOrigem(dados.getPaisOrigem());

        return repository.save(existente);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id))
            throw new IllegalArgumentException("Paciente não encontrado");
        repository.deleteById(id);
    }

    public List<Paciente> listarTodos() {
        return repository.findAll();
    }
}
