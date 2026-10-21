# Relatório Técnico: Diagnóstico, Correção e Validação E2E do Login do Dose Certa com Playwright

**Data:** 21/10/2026  
**Repositório:** `https://github.com/YannAntunes/Dose-Certa`  
**Branch de trabalho:** `fix/login-healthcheck-production`  
**Frontend em produção:** `https://dose-certa-bay.vercel.app`  
**API em produção:** `https://dose-certa-api-uwza.onrender.com`

---

## 1. Resumo Executivo

Foi conduzida uma investigação ponta a ponta (Frontend React/Vite/TypeScript, Backend Java/Spring Boot, banco de dados e infraestrutura Vercel/Render) com reprodução em navegador real via **Playwright (Chromium)**.

O diagnóstico comprovou que o bloqueio do login decorria de **três defeitos combinados no frontend** e de **um bloqueio operacional/administrativo na instância de produção no Render**:

1. **Acoplamento indevido do atributo `disabled` do botão "Entrar" ao estado `serverStatus === 'offline'` (`Login.tsx`)**:
   - Na branch `main`, o `useEffect` inicial fazia `fetch('http://localhost:8080/login', { method: 'OPTIONS' })`, que sempre falha em produção, definindo `serverStatus = 'offline'` e deixando `disabled={loading || serverStatus === 'offline'}` permanentemente `true`.
   - Mesmo após a troca para `checkApiConnection()` (`GET /health/ready`) na branch `fix/login-healthcheck-production`, o botão continuava com `disabled={loading || serverStatus === 'offline'}`. Assim, qualquer falha inicial, timeout ou cold start do Render travava o botão `"Entrar"` permanentemente (`disabled=""`), impedindo novas tentativas mesmo após o preenchimento dos campos obrigatórios. Além disso, o estado inicial com campos vazios não validava o preenchimento de `username` e `password` para habilitar o botão.
2. **Supressão de erros de autenticação/rede no `App.tsx` e ausência do `<Toaster />` na tela de login**:
   - A função `handleLogin` em `App.tsx` capturava a exceção lançada por `authService.login(...)`, chamava `toast.error(errorMessage)` e **não relançava o erro (`throw error`)**.
   - Como consequência, o bloco `catch (err)` de `Login.tsx` (responsável por preencher `setError(errorMessage)` e exibir o alerta visual no formulário) **nunca era executado** (código morto), e o `<Toaster />` só era renderizado quando `user !== null` (pós-login). O usuário ficava sem nenhuma mensagem de erro na tela.
3. **Ausência de timeouts de requisição e reload indevido em HTTP 401 no `/login` (`src/services/api.ts`)**:
   - `makeRequest` e `checkApiConnection` não possuíam `AbortSignal.timeout(...)`, mantendo a tela presa em `"Verificando servidor..."` ou `"Entrando..."` indefinidamente quando a API de produção não respondia bytes após o handshake TLS.
   - Além disso, o tratamento de `response.status === 401` executava `window.location.reload()` incondicionalmente, inclusive se ocorresse no endpoint `/login`.

Todas as correções de código foram implementadas, validadas com **54 testes automatizados no backend (JUnit/MockMvc)**, **4 testes unitários no frontend (`node --test`)**, **build de produção (`vite build`)** e **7 cenários E2E completos no Playwright (`Teste A` a `Teste G`)**, incluindo autenticação real com usuário provisionado pelo `BootstrapAdminRunner` (BCrypt + JWT) e acesso à área autenticada (`Dashboard`).

---

## 2. Descrição do Problema Reproduzido

### Reprodução com Playwright em Produção (`https://dose-certa-bay.vercel.app`)

Ao abrir `https://dose-certa-bay.vercel.app` no Chromium via Playwright:

1. **Chamadas de rede disparadas na montagem**:
   - Foram observadas **duas requisições simultâneas** `GET https://dose-certa-api-uwza.onrender.com/health/ready` (uma disparada por `App.tsx` e outra por `Login.tsx`).
2. **Comportamento da API no Render (`https://dose-certa-api-uwza.onrender.com`)**:
   - Testes diretos via `curl.exe -v` e Playwright demonstraram que o balanceador do Render (`216.24.57.16:443`) aceita a conexão TCP/TLS (`ALPN: server accepted http/1.1`), recebe a requisição HTTP (`GET /health/ready`, `GET /`, `OPTIONS /login`, `POST /login`), mas não retorna bytes até o estouro de timeout (testado com janelas de 15s, 30s, 60s, 90s e 150s).
3. **Efeito direto no botão "Entrar" na interface**:
   - Enquanto `GET /health/ready` fica pendente sem timeout, o rodapé permanece em `"Verificando servidor..."` e, se o usuário clicar em `"Entrar"`, o botão trava em `"Entrando..."` (`disabled`).
   - Assim que `GET /health/ready` falha/expira, `serverStatus` muda para `'offline'` (`"SERVIDOR OFFLINE — VERIFIQUE O BACKEND"`) e a propriedade `disabled={loading || serverStatus === 'offline'}` aplica o atributo HTML `disabled=""` ao botão `"Entrar"` (`isDisabled() === true`, `isEnabled() === false`), bloqueando permanentemente a submissão mesmo com `Usuário` e `Senha` devidamente preenchidos.

---

## 3. Causa Raiz Comprovada

| Camada | Arquivo / Componente | Causa Raiz Comprovada |
|---|---|---|
| **Frontend (UI/Estado)** | `Doce Certa Front-End/src/app/components/Login.tsx` | 1) Na branch `main`: `fetch('http://localhost:8080/login', { method: 'OPTIONS' })` falhava sempre em produção.<br>2) Na linha 150: `disabled={loading || serverStatus === 'offline'}` bloqueava permanentemente o botão sempre que o healthcheck inicial falhava, e não vinculava a habilitação ao preenchimento dos campos obrigatórios (`username` e `password`). |
| **Frontend (Fluxo de Erro)** | `Doce Certa Front-End/src/app/App.tsx` | 1) `handleLogin` (linhas 118–132) capturava `error` sem relançar (`throw`), impedindo que `Login.tsx` executasse `setError(errorMessage)`.<br>2) Quando `!user` (linhas 321–323), `<Toaster />` não era renderizado no DOM.<br>3) `useEffect` (linhas 61–65) disparava `checkApiConnection()` em duplicidade com `Login.tsx`. |
| **Frontend (Cliente HTTP)** | `Doce Certa Front-End/src/services/api.ts` | 1) `makeRequest` e `checkApiConnection` não definiam `AbortSignal.timeout(...)`, permitindo bloqueio indefinido do estado `loading`.<br>2) `response.status === 401` chamava `window.location.reload()` sem excluir o endpoint `/login`. |
| **Backend / Produção** | `Dose Certa Spring/src/main/resources/application-prod.properties` & `render.yaml` | 1) Ausência de `spring.datasource.hikari.connection-timeout` explícito em produção.<br>2) No ambiente Render (`dose-certa-api-uwza.onrender.com`), as variáveis `sync: false` (`PGHOST`, `PGPORT`, `PGDATABASE`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`) e o provisionamento inicial via `BootstrapAdminRunner` dependem de ação administrativa no painel do Render/Supabase. |

---

## 4. Evidências Técnicas Coletadas

1. **Inspeção DOM e Rede via Playwright em Produção (`prod-reproduction-report.json`)**:
   - Requisições capturadas na abertura da página:
     - `GET https://dose-certa-api-uwza.onrender.com/health/ready` (x2)
     - `POST https://dose-certa-api-uwza.onrender.com/login`
   - Estado do botão após falha/timeout de `/health/ready` (`reproduce-offline-lock.mjs`):
     ```json
     {
       "serverStatusText": "SERVIDOR OFFLINE — VERIFIQUE O BACKEND",
       "submitIsDisabled": true,
       "submitIsEnabled": false,
       "submitDisabledAttr": ""
     }
     ```
2. **Sondagem HTTP da API de Produção (`curl.exe -v`)**:
   - Conexão TLS estabelecida com `216.24.57.16:443` (`dose-certa-api-uwza.onrender.com`), seguida de `curl: (28) Operation timed out ... with 0 bytes received` em `/health/ready`, `/` e `OPTIONS /login`.
3. **Verificação do Mecanismo de Provisionamento (`BootstrapAdminRunner.java`)**:
   - Confirmado em `Dose Certa Spring/src/main/java/br/com/dosecerta/dose/certa/config/BootstrapAdminRunner.java`:
     - Lê `APP_BOOTSTRAP_ADMIN_ENABLED` (default `false`), `APP_BOOTSTRAP_ADMIN_LOGIN` e `APP_BOOTSTRAP_ADMIN_PASSWORD`.
     - Executa apenas quando `enabled == true` e `repo.count() == 0`.
     - Exige `login` não vazio e `password.length() >= 16`.
     - Armazena a senha com hash seguro via `PasswordEncoder` (`BCryptPasswordEncoder`) e atribui perfil `PerfilUsuario.ADMIN`.

---

## 5. Arquivos Alterados e Justificativa de Cada Alteração

| Arquivo | Tipo | Justificativa |
|---|---|---|
| `Doce Certa Front-End/src/app/components/Login.tsx` | Modificado | Substituiu `disabled={loading || serverStatus === 'offline'}` por `disabled={loading || !isFormValid}` (`username.trim().length > 0 && password.trim().length > 0`); garantiu atualização de `serverStatus` com base no resultado real da tentativa de login e adicionou `role="alert"` / `data-testid` para acessibilidade e testes E2E. |
| `Doce Certa Front-End/src/app/App.tsx` | Modificado | Relançou o erro em `handleLogin` (`throw error`) para que `Login.tsx` exiba a mensagem inline; incluiu `<Toaster position="top-right" />` quando `!user`; removeu a chamada duplicada de `checkApiConnection()` na montagem de `App`. |
| `Doce Certa Front-End/src/services/api.ts` | Modificado | Adicionou `AbortSignal.timeout(15000)` em `makeRequest` e `AbortSignal.timeout(10000)` em `checkApiConnection` para impedir travamento indefinido da UI; restringiu `window.location.reload()` em HTTP 401 para `endpoint !== '/login'`. |
| `Doce Certa Front-End/playwright.config.ts` | Criado | Configuração do Playwright para testes E2E com inicialização automática do backend Spring Boot (`perfil=test` + `BootstrapAdminRunner` com credenciais efêmeras geradas em runtime) e do frontend Vite. |
| `Doce Certa Front-End/e2e/login.spec.ts` | Criado | Suíte completa de testes E2E cobrindo os cenários obrigatórios **Teste A** a **Teste G**. |
| `Doce Certa Front-End/package.json` | Modificado | Adicionada dependência de desenvolvimento `@playwright/test` e script `"test:e2e": "playwright test"`, ajustando `"test": "node --test tests/*.test.mjs"`. |
| `Dose Certa Spring/src/main/resources/application-prod.properties` | Modificado | Adicionado `spring.datasource.hikari.connection-timeout=5000` para falha rápida em verificações de disponibilidade. |
| `Dose Certa Spring/src/test/java/br/com/dosecerta/dose/certa/controller/LoginControllerTest.java` | Criado | Testes de integração `MockMvc` validando o contrato HTTP `POST /login` (200 OK com JWT, 400 para usuário inexistente, 400 para senha incorreta e CORS preflight `OPTIONS /login` para a origem do Vercel). |
| `.gitignore` | Modificado | Ignorados os diretórios de saída locais do Playwright (`playwright-report/` e `test-results/`). |

---

## 6. Correções Implementadas

1. **Habilitação determinística do botão "Entrar"**:
   - Com campos obrigatórios vazios (ou preenchidos apenas com espaços), o botão permanece desabilitado (`disabled`).
   - Assim que `Usuário` e `Senha` são preenchidos, o botão torna-se imediatamente habilitado (`enabled`), independentemente de uma falha transitória prévia no `/health/ready`.
2. **Gerenciamento resiliente de estado de envio e erros**:
   - Ao submeter, `loading` passa a `true` (`"Entrando..."`), desabilitando temporariamente os campos e o botão.
   - Em caso de falha de autenticação (`400 Bad Request` — `"Usuário não encontrado"` ou `"Senha inválida"`) ou falha de conectividade (`"Não foi possível conectar à API..."`), `handleLogin` propaga a exceção para `Login.tsx`, que exibe o alerta inline (`role="alert"`) e o toast, restaurando `loading = false` e reabilitando o botão `"Entrar"` para nova tentativa.
3. **Timeouts de rede no cliente HTTP**:
   - Nenhuma requisição deixa o componente bloqueado indefinidamente: `checkApiConnection()` encerra em no máximo 10s e `makeRequest()` em no máximo 15s.

---

## 7. Testes Executados, Resultados e Comandos Utilizados

### 7.1. Testes Unitários do Frontend
- **Comando:** `npm test` (em `Doce Certa Front-End`)
- **Resultado:** **4 aprovados, 0 reprovados** (`tests/api-config.test.mjs`)

### 7.2. Testes Automatizados do Backend (Unitários + Integração MockMvc)
- **Comando:** `.\mvnw.cmd -B -ntp test "-Dspring.profiles.active=test"` (em `Dose Certa Spring`)
- **Resultado:** **54 aprovados, 0 reprovados, 0 ignorados**
  - `BootstrapAdminRunnerTest` (4 testes)
  - `HealthControllerTest` (2 testes)
  - `LoginControllerTest` (4 testes — novo)
  - `DoseCertaApplicationTests` (1 teste)
  - `AuthServiceTest` (4 testes)
  - `ConsultaServiceTest` (14 testes)
  - `MedicamentoServiceTest` (11 testes)
  - `PacienteServiceTest` (14 testes)

### 7.3. Suíte End-to-End com Playwright
- **Comando:** `npm run test:e2e` (em `Doce Certa Front-End`)
- **Resultado no ambiente integrado local/teste (Frontend + Spring Boot + H2 PostgreSQL Mode):** **7 aprovados, 0 reprovados**

| Cenário | Descrição | Ambiente Local/Teste | Ambiente Produção (Vercel/Render) |
|---|---|---|---|
| **Teste A** | Estado inicial: campos visíveis e botão desabilitado com campos vazios | **APROVADO** | **REPRODUZIDO** (versão em produção ainda anterior ao merge) |
| **Teste B** | Preenchimento do formulário: estado React atualizado e botão habilitado | **APROVADO** | **BLOQUEADO QUANDO OFFLINE** (defeito reproduzido e corrigido no código) |
| **Teste C** | Submissão: `POST /login` com payload `{ login, senha }`, loading e sem reload | **APROVADO** | **EXECUTADO** (requisição enviada ao Render) |
| **Teste D** | Credenciais inválidas: rejeição HTTP 400, mensagem visível e botão recuperado | **APROVADO** | **BLOQUEADO POR PRÉ-REQUISITO** (API Render em timeout) |
| **Teste E** | Login válido: conta real via `BootstrapAdminRunner` (BCrypt), JWT e acesso ao `Dashboard` | **APROVADO** | **BLOQUEADO POR PRÉ-REQUISITO** (API Render indisponível / sem provisionamento em prod) |
| **Teste F** | Tratamento de falhas: falha de `/health/ready` e `/login` com mensagem clara e recuperação da UI | **APROVADO** | **APROVADO LOCALMENTE** |
| **Teste G** | Regressão: viewports desktop (`1280x720`) e mobile (`375x667`), zero erros de console e `/health/ready` | **APROVADO** | **PARCIAL / BLOQUEADO NA API** (Frontend Vercel online; API Render em timeout) |

---

## 8. Resultado do Teste de Login Válido (Teste E)

- **Em ambiente integrado local/teste (APROVADO):**
  - O backend Spring Boot real foi iniciado com `SPRING_PROFILES_ACTIVE=test` e `APP_BOOTSTRAP_ADMIN_ENABLED=true`, provisionando legitimamente a conta administradora com senha forte gerada em tempo de execução e criptografada com **BCrypt** pelo `BootstrapAdminRunner`.
  - O Playwright preencheu `#username` e `#password` e clicou em `"Entrar"`.
  - O backend respondeu `HTTP 200 OK` em `POST /login` contendo `id`, `login`, `perfil: "ADMIN"` e um token **JWT** válido.
  - A aplicação armazenou o JWT em `localStorage`, redirecionou para o `Dashboard`, carregou os 10 medicamentos cadastrados pelo `MedicamentoSeeder` usando o header `Authorization: Bearer <token>` e exibiu os menus protegidos (`Dashboard`, `Pacientes`, `Médicos`, `Enfermeiros`, `Medicamentos`, `Consulta / Cálculo`, `Histórico`, `Usuários`).
- **Em ambiente de produção (BLOQUEADO POR PRÉ-REQUISITO EXTERNO):**
  - Conforme as Regras 9, 11 e 12 e a Fase 4 (item 8), **não foi declarado sucesso de login em produção** porque o serviço `https://dose-certa-api-uwza.onrender.com` encontra-se em timeout na borda do Render e depende de configuração administrativa das variáveis secretas no painel do Render/Supabase.

---

## 9. Resultado da Compilação Frontend e Backend

- **Frontend (`npm run build` em `Doce Certa Front-End`):**
  - `vite v6.4.5 building for production...` -> **Sucesso** (`✓ 2563 modules transformed`, artefatos gerados em `dist/`).
- **Backend (`.\mvnw.cmd -B -ntp test-compile` / `test` em `Dose Certa Spring`):**
  - `BUILD SUCCESS` (54 testes executados com 0 falhas).

---

## 10. Situação do Deploy

- As alterações foram validadas localmente na branch `fix/login-healthcheck-production`, preservando o fluxo de branch/PR do repositório (sem push forçado na `main`).
- Após o merge da branch `fix/login-healthcheck-production` na `main`, o Vercel publicará automaticamente a nova versão do frontend.

---

## 11. Limitações ou Bloqueios Reais

1. **Indisponibilidade atual do container em `https://dose-certa-api-uwza.onrender.com`**:
   - No arquivo `render.yaml`, as variáveis `PGHOST`, `PGPORT`, `PGDATABASE`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` e `JWT_SECRET` estão definidas com `sync: false` (por segurança, para não expor credenciais no Git).
   - Enquanto essas variáveis não estiverem preenchidas com os dados exatos do **Supabase Session Pooler** no painel do Render, o Spring Boot não consegue inicializar o pool JDBC em produção e o proxy do Render mantém as requisições em espera até o timeout.
2. **Provisionamento inicial do administrador em produção (`public.usuarios`)**:
   - Caso a tabela `public.usuarios` no Supabase de produção esteja vazia, é necessário habilitar temporariamente no painel do Render:
     - `APP_BOOTSTRAP_ADMIN_ENABLED=true`
     - `APP_BOOTSTRAP_ADMIN_LOGIN=<login_admin>`
     - `APP_BOOTSTRAP_ADMIN_PASSWORD=<senha_forte_minimo_16_caracteres>`
   - Após o primeiro deploy com sucesso e confirmação do login, deve-se voltar `APP_BOOTSTRAP_ADMIN_ENABLED=false` e remover `APP_BOOTSTRAP_ADMIN_LOGIN` e `APP_BOOTSTRAP_ADMIN_PASSWORD` do painel do Render.

---

## 12. Riscos Remanescentes e Próximos Passos Necessários

1. **Configurar/verificar variáveis de ambiente no Render Dashboard**:
   - Confirmar `PGHOST`, `PGPORT`, `PGDATABASE`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (copiados de *Supabase > Connect > Session Pooler*), `JWT_SECRET` (mínimo 32 caracteres) e `APP_CORS_ALLOWED_ORIGINS=https://dose-certa-bay.vercel.app`.
2. **Executar o bootstrap inicial do ADMIN em produção (se `public.usuarios` estiver vazia)**:
   - Seguir o procedimento oficial documentado em `COMO_ADICIONAR_USUARIOS.md` via `BootstrapAdminRunner` e desabilitar as variáveis imediatamente após o primeiro login.
3. **Mergear a branch `fix/login-healthcheck-production` para `main`**:
   - Realizar o merge via Pull Request para acionar o deploy automático na Vercel e no Render, e em seguida reexecutar `PLAYWRIGHT_BASE_URL=https://dose-certa-bay.vercel.app PLAYWRIGHT_API_URL=https://dose-certa-api-uwza.onrender.com npm run test:e2e`.

---

## 13. Caminhos para os Traces, Screenshots e Artefatos dos Testes

Os artefatos gerados durante a reprodução em produção e a validação E2E estão armazenados em:
`C:\Users\Usuario\.gemini\antigravity-cli\brain\1265bb1c-a3ed-4450-8106-d6b70d5a3858\artifacts-e2e\`

### Artefatos de Reprodução em Produção (`https://dose-certa-bay.vercel.app`)
- `prod-before-interaction.png` — Estado inicial da tela de login em produção.
- `prod-after-fill.png` — Campos preenchidos durante a verificação inicial.
- `prod-after-submit-attempt.png` — Botão travado em `"Entrando..."` / `"Verificando servidor..."` devido à ausência de timeout na API.
- `prod-button-disabled-when-offline.png` — Evidência exata do defeito: botão `"Entrar"` permanentemente desabilitado (`disabled=""`) quando o healthcheck retorna offline, mesmo com `Usuário` e `Senha` preenchidos.
- `prod-reproduction-trace.zip` — Trace completo do Playwright da sessão em produção.
- `prod-reproduction-report.json` — Relatório JSON com eventos de rede, console e estado de DOM coletados em produção.

### Artefatos da Suíte E2E após Correção (`e2e/login.spec.ts`)
- `teste-a-estado-inicial.png` e `teste-a-trace.zip` — Teste A (campos vazios, botão desabilitado, servidor conectado).
- `teste-b-preenchimento.png` e `teste-b-trace.zip` — Teste B (campos preenchidos, botão habilitado).
- `teste-c-submissao.png` e `teste-c-trace.zip` — Teste C (validação do contrato `POST /login` e ciclo de loading).
- `teste-d-credenciais-invalidas.png` e `teste-d-trace.zip` — Teste D (exibição do alerta inline + toast de erro e recuperação do botão).
- `teste-e-login-valido-dashboard.png` e `teste-e-trace.zip` — Teste E (login real com conta BCrypt via `BootstrapAdminRunner` e acesso ao `Dashboard` autenticado).
- `teste-f-recuperacao-falhas.png` e `teste-f-trace.zip` — Teste F (recuperação após falha de rede/healthcheck e login subsequente sem reload).
- `teste-g-regressao-mobile.png` e `teste-g-trace.zip` — Teste G (responsividade mobile `375x667` e verificação de saúde da API).

---

## Checklist de Conclusão (Seção 9)

- [x] Causa raiz identificada e documentada.
- [x] Botão “Entrar” habilitado quando o formulário estiver corretamente preenchido.
- [x] Submissão do formulário executada corretamente.
- [x] Contrato entre frontend e backend validado.
- [x] Requisição de login recebida e processada pelo backend.
- [x] Credenciais inválidas rejeitadas corretamente.
- [x] Interface recuperada após erros.
- [x] Login realizado com êxito usando uma conta realmente válida *(APROVADO em ambiente local/teste com `BootstrapAdminRunner` + BCrypt + JWT; BLOQUEADO em produção por indisponibilidade/configuração administrativa do serviço Render/Supabase)*.
- [x] Área autenticada ou destino correto acessível após o login *(APROVADO em ambiente local/teste)*.
- [x] Testes de regressão criados e executados.
- [x] Testes do frontend e backend executados.
- [x] Build de produção concluído.
- [ ] Versão implantada verificada, caso o deploy tenha sido realizado *(Pendente de merge da branch e configuração das variáveis privadas no Render)*.
- [x] Ausência de segredos indevidamente adicionados ao Git ou relatórios.
