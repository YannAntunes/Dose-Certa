# Módulo de Análise Inteligente de Exames Laboratoriais — Dose Certa

Este documento detalha a arquitetura, modelo de dados, endpoints, integrações, testes e procedimentos de operação do módulo de análise assistida de exames laboratoriais do **Dose Certa**.

---

## 1. Papel e Finalidade Clínica

O módulo atua como uma ferramenta de **apoio à decisão clínica**, destinada a:
- Estruturar e padronizar laudos laboratoriais recebidos em formato PDF.
- Avaliar deterministicamente os resultados frente às referências informadas pelo laboratório ou cadastradas na base.
- Permitir acompanhamento cronológico de resultados comparáveis do mesmo paciente.
- Fornecer sumário e considerações assistidas via **Google Gemini**, sem substituir o julgamento médico, prescrever tratamentos ou emitir diagnósticos autônomos.

> **Aviso Obrigatório:** A análise gerada pela inteligência artificial é estritamente informativa e de apoio à decisão clínica. O sistema não substitui a avaliação do profissional de saúde habilitado.

---

## 2. Arquitetura do Módulo

O fluxo de processamento é estritamente sequencial, desacoplado e fail-safe:

```
[ Upload PDF ]
      │
      ▼
[ Validação & Storage ] ──▶ Armazenamento seguro (chave UUID fora de pasta pública)
      │
      ▼
[ Extração PDFBox ] ──────▶ Detecta páginas e conteúdo textual; sinaliza OCR_REQUIRED se escaneado
      │
      ▼
[ Parsing Modular ] ──────▶ Estrutura analitos, unidades, referências e tabelas históricas
      │
      ▼
[ Normalização ] ─────────▶ Mapeia códigos internos (ex: GLUCOSE, AST) e unidades canônicas
      │
      ▼
[ Persistência dos Resultados ] ──▶ Registra Exam e ExamResult (status UPLOADED -> PROCESSED)
      │
      ▼
[ Motor Determinístico ] ─▶ Avalia limites (WITHIN/BELOW/ABOVE/CRITICAL/REQUIRES_CONTEXT/NO_REFERENCE)
      │
      ▼
[ Solicitação de Análise ]
      │
      ▼
[ Context Builder ] ─────▶ Monta payload anonimizado (sem nome/CPF/arquivos; apenas dados clínicos)
      │
      ▼
[ Google Gemini Client ] ─▶ REST /v1beta com prompt de sistema e responseSchema JSON estrito
      │
      ▼
[ Response Validator ] ──▶ Valida estritamente contra contrato e contra status determinísticos
      │
      ▼
[ Persistência da Análise ] ─▶ Registra ExamAnalysis, ClinicalFinding e AnalysisSource
```

---

## 3. Entidades e Modelo de Dados

Todas as entidades estão mapeadas no pacote `br.com.dosecerta.dose.certa.exame.model`:

1. **`Exam`**: Representa o documento de exame enviado.
   - Vinculado ao `Paciente` existente via `paciente_id`.
   - Campos: `storageKey` (UUID opaco), `fileSha256` (anti-duplicidade por paciente), `status` (`UPLOADED`, `PROCESSING`, `PROCESSED`, `ANALYZED`, `ERROR`), `collectionDate`, `releaseDate`, `laboratory`, `sex`, `processingNotes`.
2. **`ExamResult`**: Resultado laboratorial individual.
   - Campos: `testCode` (código normalizado), `originalName`, `normalizedName`, `numericValue`, `textValue`, `originalUnit`, `normalizedUnit`, `referenceText`, limites estruturados (`refLower`, `refUpper`, operadores `GT/GE/LT/LE`), `status`, `appliedReference`, `confidence`, `needsReview`, `qualitative`, `historical`, `resultDate`, `notes`.
3. **`ReferenceRange`**: Intervalos de referência versionados com fonte bibliográfica obrigatória.
   - Suporta faixas condicionadas a sexo, idade mínima/máxima e limites críticos documentados (`criticalLow`, `criticalHigh`).
4. **`ClinicalTarget`**: Metas clínicas e critérios terapêuticos (ex: Diretrizes de Diabetes/Dislipidemia). Mantidas separadas dos intervalos de referência laboratoriais.
5. **`ExamAnalysis`**: Registro de uma análise executada.
   - Preserva o histórico de auditoria (execuções anteriores não são sobrescritas).
   - Campos: `status` (`PENDING`, `PROCESSING`, `COMPLETED`, `INSUFFICIENT_CONTEXT`, `ERROR`), `summary`, `warnings`, `modelId`, `contractVersion`, `requestedBy`, timestamps.
6. **`ClinicalFinding`**: Observação individual da análise associada ao resultado.
   - Tipos: `WITHIN_REFERENCE`, `BELOW_REFERENCE`, `ABOVE_REFERENCE`, `TREND`, `REQUIRES_CONTEXT`, `CLINICAL_CONSIDERATION`.
   - Severidade informativa: `INFO`, `ATTENTION`, `RELEVANT`.
7. **`AnalysisSource`**: Fontes verificadas registradas na análise (a IA nunca inventa fontes).

---

## 4. Endpoints REST

Base path: `/api/v1`

| Método | Endpoint | Perfis Permitidos | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/exams` | `ADMIN`, `MEDICO`, `ENFERMEIRO` | Upload de PDF com parâmetros multipart `patientId`, `file` e opcional `sex` (M/F) |
| `GET` | `/api/v1/exams/{id}` | `ADMIN`, `MEDICO`, `ENFERMEIRO` | Detalhes do exame e lista de resultados extraídos |
| `GET` | `/api/v1/exams/{id}/results` | `ADMIN`, `MEDICO`, `ENFERMEIRO` | Lista somente os resultados do exame |
| `GET` | `/api/v1/patients/{patientId}/exams` | `ADMIN`, `MEDICO`, `ENFERMEIRO` | Listagem paginada dos exames do paciente |
| `POST` | `/api/v1/exams/{id}/analyze` | `ADMIN`, `MEDICO` | Aciona a análise assistida pelo Google Gemini |
| `GET` | `/api/v1/exams/{id}/analyses/latest` | `ADMIN`, `MEDICO`, `ENFERMEIRO` | Consulta a análise mais recente concluída |

*Obs.: Usuários com perfil `RECEPCAO` não possuem acesso a dados clínicos de exames.*

---

## 5. Variáveis de Ambiente e Configuração

Configurações disponíveis no `application.properties`:

| Variável / Propriedade | Padrão | Descrição |
|---|---|---|
| `EXAMS_STORAGE_DIR` / `exam.storage.dir` | `./data/exams` | Diretório interno no servidor para armazenar os arquivos PDF |
| `GEMINI_API_KEY` / `exam.gemini.api-key` | *(vazio)* | Chave da Google Gemini API. Sem esta chave, o endpoint `/analyze` responde `503 Service Unavailable` de forma controlada |
| `GEMINI_MODEL` / `exam.gemini.model` | `gemini-3.5-flash-lite` | Identificador do modelo no endpoint `generateContent` |
| `exam.gemini.base-url` | `https://generativelanguage.googleapis.com/v1beta` | URL base da API Gemini |
| `exam.upload.max-bytes` | `10485760` (10 MB) | Tamanho máximo por arquivo PDF |
| `exam.upload.max-pages` | `200` | Limite de páginas por documento para mitigar exaustão de memória |

---

## 6. Procedimento de Banco de Dados e Migrations

- Em ambiente local e de desenvolvimento, o Spring Boot utiliza `spring.jpa.hibernate.ddl-auto=update`.
- Para ambientes corporativos e produção com PostgreSQL, o script DDL idempotente com índices otimizados e chaves estrangeiras está disponível em:
  `src/main/resources/schema-exames.sql`

O script cria as tabelas com `IF NOT EXISTS` e índices relacionais sem remover tabelas existentes.

---

## 7. Como Executar a Aplicação e os Testes

### Executar a aplicação com backend Spring Boot:
```bash
cd "Dose Certa Spring"
# Definindo chave do Gemini opcionalmente
export GEMINI_API_KEY="sua_chave_aqui"
./mvnw spring-boot:run
```

### Executar a suíte de testes:
```bash
cd "Dose Certa Spring"
# Executar todos os testes automatizados (unitários + integração)
mvn test
```

---

## 8. Segurança e Privacidade (LGPD)

1. **Anonimização no envio à IA:** O payload enviado ao Google Gemini contém estritamente analitos, valores numéricos, unidades, referências e histórico de números. Nenhum dado pessoal (nome, CPF, endereço, número de prontuário, nome do arquivo) é transmitido à API do Gemini.
2. **Armazenamento Seguro:** Arquivos salvos em pasta isolada configurável (`./data/exams`), com nome aleatório `UUID.pdf`, prevenindo ataques de *path traversal*.
3. **Chaves Ocultas:** Chaves de API nunca são expostas em logs, requisições GET ou URLs.
4. **Isolamento de Pacientes:** Consultas históricas filtram obrigatoriamente por `paciente_id` e status do exame.
5. **Prevenção de Duplicatas:** O hash SHA-256 do arquivo previne envios repetidos acidentais para o mesmo paciente.

---

## 9. Limitações e Preparação para RAG

- **PDFs Escaneados:** Extração baseada em texto embutido via Apache PDFBox. PDFs puramente imagéticos são rejeitados com `OCR_REQUIRED`. Uma interface extensível `OcrEngine` foi criada para acoplamento de Tesseract/Google Vision quando viável.
- **RAG com Diretrizes Clínicas:** A interface `KnowledgeRetriever` está implementada com `NoKnowledgeRetriever` para garantir que fontes não verificadas jamais sejam inventadas. Quando documentos do Ministério da Saúde ou SBC forem indexados em `pgvector`, basta fornecer um bean `KnowledgeRetriever`.
