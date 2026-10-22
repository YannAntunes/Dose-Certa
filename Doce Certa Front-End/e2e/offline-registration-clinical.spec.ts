import { test, expect } from '@playwright/test';

const ADMIN_LOGIN = process.env.E2E_ADMIN_LOGIN || 'admin_e2e_local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

test.describe('Dose Certa — E2E Cadastro Público, Offline-First e Segurança Clínica', () => {
  test('Fluxo 1 — Cadastro público (PENDENTE), bloqueio antes da aprovação, aprovação pelo ADMIN, controle de acesso por perfil e revogação de sessão', async ({
    page,
  }) => {
    const novoLogin = `enf.e2e.${Date.now()}`;
    const novaSenha = 'SenhaForte123';

    await page.goto('/');

    // 1. Abre o formulário de solicitação de cadastro público
    await page.getByTestId('toggle-register-btn').click();
    await expect(page.getByTestId('register-form')).toBeVisible();

    // Verifica que não existe opção ADMIN no seletor público
    const options = await page.getByTestId('reg-perfil-select').locator('option').allTextContents();
    expect(options.join(' ')).not.toContain('Administrador');
    expect(options.join(' ')).not.toContain('ADMIN');

    // 2. Envia solicitação de cadastro como ENFERMEIRO
    await page.getByTestId('reg-login-input').fill(novoLogin);
    await page.getByTestId('reg-perfil-select').selectOption('ENFERMEIRO');
    await page.getByTestId('reg-senha-input').fill(novaSenha);
    await page.getByTestId('reg-confirm-senha-input').fill(novaSenha);
    await page.getByTestId('register-submit-btn').click();

    await expect(page.getByTestId('register-success')).toBeVisible();
    await expect(page.getByTestId('register-success')).toContainText('PENDENTE');

    // 3. Tenta fazer login enquanto ainda está PENDENTE -> deve ser bloqueado (403)
    await page.getByTestId('back-to-login-btn').click();
    await page.locator('#username').fill(novoLogin);
    await page.locator('#password').fill(novaSenha);
    await page.locator('button[type="submit"]').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toContainText(/pendente de aprovação|aguarda aprovação/i);

    // 4. Login como ADMIN para aprovar a solicitação
    await page.locator('#username').fill(ADMIN_LOGIN);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    await page.locator('aside button', { hasText: /Usuários|Users/i }).click();

    const userRow = page.getByTestId(`usuario-row-${novoLogin}`);
    await expect(userRow).toBeVisible();
    await expect(page.getByTestId(`usuario-status-${novoLogin}`)).toHaveText('PENDENTE');

    // Aprova definindo perfil ENFERMEIRO
    await page.getByTestId(`approve-role-select-${novoLogin}`).selectOption('ENFERMEIRO');
    await page.getByTestId(`approve-user-btn-${novoLogin}`).click();
    await expect(page.getByTestId(`usuario-status-${novoLogin}`)).toHaveText('ATIVO');

    // 5. Faz logout do ADMIN e entra com o novo usuário aprovado
    await page.locator('header button[title*="Sair"], header button[title*="Logout"]').click();
    await expect(page.locator('#username')).toBeVisible();

    await page.locator('#username').fill(novoLogin);
    await page.locator('#password').fill(novaSenha);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });

    // Verifica autorização por perfil (ENFERMEIRO vê Consulta e Pacientes, mas NÃO vê Usuários nem Médicos)
    await expect(page.locator('aside button', { hasText: /Pacientes|Patients/i })).toBeVisible();
    await expect(page.locator('aside button', { hasText: /Consulta|Consultation/i })).toBeVisible();
    await expect(page.locator('aside button', { hasText: /Usuários|Users/i })).toHaveCount(0);

    // 6. Simula expiração/revogação de token (401 CONTA_INATIVA) -> deve limpar sessão e redirecionar ao login
    await page.route('**/pacientes', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'CONTA_INATIVA',
          message: 'Sessão revogada: conta não está ativa.',
        }),
      });
    });
    await page.getByTestId('sync-now-btn').click();
    await expect(page.locator('#username')).toBeVisible({ timeout: 10000 });
  });

  test('Fluxo 2 — Offline-First (IndexedDB/Dexie): cache no cold start, fila persistente após F5/reabertura, sincronização idempotente e conflito', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    await page.locator('#username').fill(ADMIN_LOGIN);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });

    // Vai para Pacientes e cadastra um paciente online primeiro
    await page.locator('aside button', { hasText: /Pacientes|Patients/i }).click();

    const nomeOnline = `Paciente Online ${Date.now()}`;
    await page.locator('#nome').fill(nomeOnline);
    await page.locator('#tipoDocumento').selectOption('PASSAPORTE');
    await page.locator('#cpf').fill(`ON${Date.now().toString().slice(-6)}`);
    await page.locator('#idade').fill('34');
    await page.locator('#peso').fill('70');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('table')).toContainText(nomeOnline);

    // Ativa modo offline e cadastra um paciente na fila local
    await context.setOffline(true);

    const nomeOffline = `Paciente Offline ${Date.now()}`;
    const docOffline = `OFF${Date.now().toString().slice(-6)}`;
    await page.locator('#nome').fill(nomeOffline);
    await page.locator('#tipoDocumento').selectOption('PASSAPORTE');
    await page.locator('#cpf').fill(docOffline);
    await page.locator('#idade').fill('29');
    await page.locator('#peso').fill('62.5');
    await page.locator('form button[type="submit"]').click();

    // Deve aparecer imediatamente com badge "Pendente"
    const rowOffline = page.locator('tr', { hasText: nomeOffline });
    await expect(rowOffline).toBeVisible();
    await expect(rowOffline.getByTestId('sync-badge-pendente')).toBeVisible();
    await expect(page.getByTestId('sync-status-bar')).toContainText('Pendente');

    // Simula recarregamento (F5) com backend simulando cold start / falha 503 em todo o contexto do navegador
    let coldStartSimulado = true;
    let idempotencyKeyCapturada = '';

    await context.route('**/pacientes', async (route) => {
      if (coldStartSimulado) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Render cold start' }),
        });
        return;
      }
      if (route.request().method() === 'POST') {
        idempotencyKeyCapturada = route.request().headers()['x-idempotency-key'] || '';
      }
      await route.continue();
    });

    await context.setOffline(false);

    await page.reload();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    await page.locator('aside button', { hasText: /Pacientes|Patients/i }).click();

    // Mesmo durante falha 503 (cold start), os dados do IndexedDB são exibidos imediatamente sem bloqueio!
    await expect(page.locator('table')).toContainText(nomeOnline);
    await expect(page.locator('table')).toContainText(nomeOffline);

    // Simula fechamento e reabertura de aba do navegador
    const novaAba = await context.newPage();
    await novaAba.goto('/');
    await expect(novaAba.locator('aside')).toBeVisible({ timeout: 15000 });
    await novaAba.locator('aside button', { hasText: /Pacientes|Patients/i }).click();
    await expect(novaAba.locator('table')).toContainText(nomeOffline);
    await novaAba.close();

    // Libera o servidor do cold start e sincroniza
    coldStartSimulado = false;
    await page.getByTestId('sync-now-btn').click();

    // Verifica que o item foi sincronizado com X-Idempotency-Key e sem duplicação
    await expect(rowOffline.getByTestId('sync-badge-sincronizado')).toBeVisible({ timeout: 15000 });
    expect(idempotencyKeyCapturada.length).toBeGreaterThan(5);
    await expect(page.locator('tr', { hasText: nomeOffline })).toHaveCount(1);

    // Simula um conflito de sincronização (409 Conflict) em item criado offline
    await context.setOffline(true);
    const nomeConflito = `Paciente Conflito ${Date.now()}`;
    await page.locator('#nome').fill(nomeConflito);
    await page.locator('#tipoDocumento').selectOption('PASSAPORTE');
    await page.locator('#cpf').fill(docOffline); // Documento duplicado causará conflito no servidor
    await page.locator('#idade').fill('50');
    await page.locator('#peso').fill('80');
    await page.locator('form button[type="submit"]').click();

    await context.setOffline(false);
    await page.getByTestId('sync-now-btn').click();

    // Deve exibir o painel de conflito/erro e permitir descartar o item conflitante
    await expect(page.getByTestId('sync-error-panel')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sync-discard-item-btn').first().click();
    await expect(page.getByTestId('sync-error-panel')).toHaveCount(0);
  });

  test('Fluxo 3 — Cálculos clínicos, alerta de dose máxima, rascunho persistente e guarda de segurança clínica offline', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    await page.locator('#username').fill(ADMIN_LOGIN);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });

    // 1. Garante um Médico cadastrado
    await page.locator('aside button', { hasText: /Médicos|Doctors/i }).click();
    const nomeMedico = `Dr. Clinico ${Date.now().toString().slice(-4)}`;
    const crmRandom = Math.floor(100000 + Math.random() * 800000).toString();
    await page.locator('#nome').fill(nomeMedico);
    await page.locator('#crm').fill(crmRandom);
    await page.locator('form button[role="combobox"]').click();
    await page.getByRole('option', { name: 'SP' }).click();
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('table')).toContainText(nomeMedico);

    // 2. Garante um Paciente de 80kg para testar cálculo e alerta de dose máxima
    await page.locator('aside button', { hasText: /Pacientes|Patients/i }).click();
    const nomePaciente = `Paciente Calculo ${Date.now().toString().slice(-4)}`;
    await page.locator('#nome').fill(nomePaciente);
    await page.locator('#tipoDocumento').selectOption('PASSAPORTE');
    await page.locator('#cpf').fill(`CL${Date.now().toString().slice(-6)}`);
    await page.locator('#idade').fill('45');
    await page.locator('#peso').fill('80');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('table')).toContainText(nomePaciente);

    // 3. Acessa a tela de Consulta e gera cálculo
    await page.locator('aside button', { hasText: /Consulta|Consultation/i }).click();

    const comboboxes = page.locator('button[role="combobox"]');
    // [0] Tipo Profissional, [1] Médico, [2] Paciente, [3] Medicamento, [4] Tipo Cálculo
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: new RegExp(nomeMedico) }).click();

    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: new RegExp(nomePaciente) }).click();

    await comboboxes.nth(3).click();
    await page.getByRole('option').first().click();

    await page.getByTestId('consulta-gerar-calculo-btn').click();

    await expect(page.getByTestId('consulta-resultado-final')).toBeVisible();
    await expect(page.getByTestId('consulta-draft-status')).toContainText('Salvo neste dispositivo');

    // 4. Recarrega a página (F5) e verifica que o rascunho clínico foi restaurado do IndexedDB
    await page.reload();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    await page.locator('aside button', { hasText: /Consulta|Consultation/i }).click();
    await expect(page.getByTestId('consulta-resultado-final')).toBeVisible();
    await expect(page.getByTestId('consulta-prescricao-textarea')).not.toHaveValue('');

    // 5. Salva a consulta em modo Offline: deve exibir a guarda de segurança clínica e bloquear PDF oficial até validar no servidor
    await context.setOffline(true);
    await page.getByTestId('consulta-salvar-btn').click();

    await expect(page.getByTestId('consulta-offline-clinical-guard')).toBeVisible();
    await expect(page.getByTestId('consulta-pdf-interno-btn')).toBeDisabled();
    await expect(page.getByTestId('consulta-pdf-digital-btn')).toBeDisabled();

    // 6. Restaura conexão e sincroniza: servidor valida a consulta e libera emissão de PDF!
    await context.setOffline(false);
    await page.getByTestId('sync-now-btn').click();

    await expect(page.getByTestId('consulta-server-confirmed-badge')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('consulta-pdf-interno-btn')).toBeEnabled();
    await expect(page.getByTestId('consulta-pdf-digital-btn')).toBeEnabled();
  });
});
