import { test, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8080';
const ADMIN_LOGIN = process.env.E2E_ADMIN_LOGIN || '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

test.describe('Dose Certa — E2E Login & Autenticação', () => {
  test('Teste A — Estado inicial: campos visíveis e botão Entrar desabilitado com campos vazios', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    await expect(usernameInput).toHaveValue('');
    await expect(passwordInput).toHaveValue('');

    // Com campos obrigatórios vazios, o botão deve estar desabilitado
    await expect(submitButton).toBeDisabled();
    expect(await submitButton.isDisabled()).toBe(true);
    expect(await submitButton.isEnabled()).toBe(false);
  });

  test('Teste B — Preenchimento do formulário: atualização de estado React e habilitação do botão', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');

    await expect(submitButton).toBeDisabled();

    // Preencher apenas o usuário mantém o botão desabilitado
    await usernameInput.fill('profissional.teste');
    await expect(usernameInput).toHaveValue('profissional.teste');
    await expect(submitButton).toBeDisabled();

    // Preencher a senha habilita o botão
    await passwordInput.fill('SenhaQualquer123!');
    await expect(passwordInput).toHaveValue('SenhaQualquer123!');
    await expect(submitButton).toBeEnabled();
    expect(await submitButton.isEnabled()).toBe(true);
    expect(await submitButton.isDisabled()).toBe(false);

    // Limpar um campo volta a desabilitar o botão
    await passwordInput.fill('   ');
    await expect(submitButton).toBeDisabled();

    await passwordInput.fill('SenhaQualquer123!');
    await expect(submitButton).toBeEnabled();
  });

  test('Teste C — Submissão: envia POST /login com contrato correto, gerencia loading e sem reload de página', async ({ page }) => {
    await page.goto('/');

    let navigationCount = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationCount += 1;
      }
    });

    // Adiciona um pequeno atraso controlado apenas na interceptação para inspecionar o estado de loading durante o envio
    let capturedMethod = '';
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedPayload: Record<string, unknown> | null = null;

    await page.route('**/login', async (route) => {
      const req = route.request();
      capturedMethod = req.method();
      capturedUrl = req.url();
      capturedHeaders = req.headers();
      capturedPayload = req.postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');

    await usernameInput.fill('usuario_contrato_teste');
    await passwordInput.fill('SenhaContrato123!');
    await expect(submitButton).toBeEnabled();

    const responsePromise = page.waitForResponse((res) => res.url().endsWith('/login') && res.request().method() === 'POST');
    await submitButton.click();

    // Durante o envio, o botão deve ficar desabilitado (loading)
    await expect(submitButton).toBeDisabled();

    const response = await responsePromise;
    expect(response.status()).toBe(400);

    // Verifica contrato da requisição enviada ao backend
    expect(capturedMethod).toBe('POST');
    expect(capturedUrl).toBe(`${API_URL}/login`);
    expect(capturedHeaders['content-type']).toContain('application/json');
    expect(capturedPayload).toEqual({
      login: 'usuario_contrato_teste',
      senha: 'SenhaContrato123!',
    });

    // Confirma que não houve reload da página
    expect(navigationCount).toBe(0);

    // Confirma que o estado de carregamento terminou e o botão voltou a ficar habilitado
    await expect(submitButton).toBeEnabled();
  });

  test('Teste D — Credenciais inválidas: rejeição pela API, exibição de mensagem de erro e botão recuperado', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');
    const errorAlert = page.getByTestId('login-error');

    // Caso 1: Usuário inexistente
    await usernameInput.fill('conta_inexistente_999');
    await passwordInput.fill('SenhaInvalida999!');

    const [responseUserNotFound] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/login') && res.request().method() === 'POST'),
      submitButton.click(),
    ]);

    expect(responseUserNotFound.status()).toBe(400);
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Usuário não encontrado');
    await expect(submitButton).toBeEnabled();
    await expect(usernameInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();

    // Caso 2: Usuário existente com senha incorreta
    test.skip(!ADMIN_LOGIN, 'Requer login de teste configurado');
    await usernameInput.fill(ADMIN_LOGIN);
    await passwordInput.fill('SenhaIncorretaParaAdmin123!');

    const [responseWrongPass] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/login') && res.request().method() === 'POST'),
      submitButton.click(),
    ]);

    expect(responseWrongPass.status()).toBe(400);
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Senha inválida');
    await expect(submitButton).toBeEnabled();
  });

  test('Teste E — Login válido: autenticação real com conta provisionada via BootstrapAdminRunner e acesso à área protegida', async ({ page }) => {
    test.skip(!ADMIN_LOGIN || !ADMIN_PASSWORD, 'Pré-requisito ausente: credenciais de teste não fornecidas');

    await page.goto('/');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');

    await usernameInput.fill(ADMIN_LOGIN);
    await passwordInput.fill(ADMIN_PASSWORD);
    await expect(submitButton).toBeEnabled();

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/login') && res.request().method() === 'POST'),
      submitButton.click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.login).toBe(ADMIN_LOGIN);
    expect(loginBody.perfil).toBe('ADMIN');
    expect(typeof loginBody.token).toBe('string');
    expect(loginBody.token.length).toBeGreaterThan(20);

    // Verifica que a área autenticada (Dashboard) é aberta e elementos protegidos são exibidos
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('header')).toContainText(ADMIN_LOGIN);
    await expect(page.locator('header')).toContainText('ADMIN');
    await expect(page.locator('aside')).toContainText(/Pacientes|Patients/);
    await expect(page.locator('aside')).toContainText(/Medicamentos|Medications/);
    await expect(page.locator('aside')).toContainText(/Usuários|Users/);

    // Confirma que o token foi persistido no localStorage conforme a arquitetura atual
    const storedToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(storedToken).toBeTruthy();
  });

  test('Teste F — Tratamento de falhas: falha no healthcheck inicial e falha de rede no POST /login não travam a interface', async ({ page }) => {
    // Simula falha inicial no /health/ready
    await page.route('**/health/ready', (route) => route.abort('failed'));

    await page.goto('/');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');
    const serverStatus = page.getByTestId('server-status');

    await expect(serverStatus).toContainText(/offline/i);

    // Regressão crítica: mesmo com status inicial offline, preencher o formulário DEVE habilitar o botão Entrar
    await usernameInput.fill(ADMIN_LOGIN || 'admin');
    await passwordInput.fill(ADMIN_PASSWORD || 'SenhaTeste12345678!');
    await expect(submitButton).toBeEnabled();

    // Simula falha de rede no POST /login na primeira tentativa
    let failLoginOnce = true;
    await page.route('**/login', async (route) => {
      if (failLoginOnce) {
        failLoginOnce = false;
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await submitButton.click();

    const errorAlert = page.getByTestId('login-error');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Não foi possível conectar à API');

    // Confirma que não expõe senhas ou tokens na mensagem de erro
    const errorText = await errorAlert.innerText();
    if (ADMIN_PASSWORD) {
      expect(errorText).not.toContain(ADMIN_PASSWORD);
    }

    // Confirma que a interface volta a permitir interação após a falha e permite nova tentativa bem-sucedida
    await expect(submitButton).toBeEnabled();
    await expect(usernameInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();

    if (ADMIN_LOGIN && ADMIN_PASSWORD) {
      await submitButton.click();
      await expect(page.locator('aside')).toBeVisible();
    }
  });

  test('Teste G — Regressão, responsividade (desktop e mobile), ausência de erros no console e saúde da API', async ({ page, request }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 1. Verifica endpoint de disponibilidade da API (/health/ready)
    const healthRes = await request.get(`${API_URL}/health/ready`);
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson).toEqual({ status: 'UP', database: 'UP' });

    // 2. Viewport Desktop (1280x720)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByTestId('server-status')).toContainText(/conectado|connected/i);

    // 3. Viewport Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await page.locator('#username').fill('teste.mobile');
    await page.locator('#password').fill('SenhaMobile123!');
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    // 4. Confirma ausência de erros inesperados no console ou exceções não tratadas
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
